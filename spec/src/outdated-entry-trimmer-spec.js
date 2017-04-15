const mock = require('mock-require');
const MockEntryBuilder = require('../mock/mock-entry-builder');
const Promise = require('sync-p');

describe('OutdatedEntryTrimmer', function () {
    function testAsync(runAsync) {
        return function (done) {
            runAsync().then(
                done,
                function (e) {
                    fail(e);
                    done();
                }
            );
        };
    }

    const space = 'space';

    let outdatedEntryTrimmer;
    let linkedEntryIdCollector;
    let contentful = {};
    let entryTraverser;
    let entries;

    function defineLinkedEntries(entryLinks) {
        entryTraverser.traverse = jasmine.createSpy('entryTraverser.traverse').and.callFake(entries => {
            const entryIds = [];
            for (const entry of entries) {
                if (entryLinks.has(entry.sys.id)) {
                    entryIds.push(...entryLinks.get(entry.sys.id));
                }
            }
            linkedEntryIdCollector.entryIds = new Set(entryIds);
        });
    }

    beforeEach(function () {
        jasmine.clock().install();
        jasmine.clock().mockDate();

        entries = [];

        contentful.deleteEntity = jasmine.createSpy('contentful.deleteEntity');
        contentful.getEntries = jasmine.createSpy('contentful.getEntries').and.returnValue(new Promise((resolve) => resolve(entries)));
        contentful.isInGracePeriod = jasmine.createSpy('contentful.isInGracePeriod').and.returnValue(false);

        entryTraverser = {
            traverse: jasmine.createSpy('entryTraverser.traverse')
        };

        linkedEntryIdCollector = {};

        mock('../../src/contentful', contentful);
        mock('../../src/linked-entry-id-collector', class { constructor() { return linkedEntryIdCollector; }});
        mock('../../src/entry-traverser', class { constructor() { return entryTraverser; }});

        const OutdatedEntryTrimmer = require('../../src/outdated-entry-trimmer');
        outdatedEntryTrimmer = new OutdatedEntryTrimmer('endDate');
    });

    afterEach(function () {
        mock.stopAll();
        jasmine.clock().uninstall();
    });

    it('deletes outdated entries', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withField('endDate', new Date(new Date() - 1e4)).get()
        );

        linkedEntryIdCollector.entryIds = new Set();

        await outdatedEntryTrimmer.trim(space);

        expect(entryTraverser.traverse).toHaveBeenCalledWith(entries, linkedEntryIdCollector);

        for (const entry of entries) {
            expect(contentful.deleteEntity).toHaveBeenCalledWith(entry);
        }

        expect(outdatedEntryTrimmer.stats.deletedCount).toBe(2);
    }));

    it('keeps current entries', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withField('endDate', new Date(+new Date() + 1e4)).get()
        );

        linkedEntryIdCollector.entryIds = new Set();

        await outdatedEntryTrimmer.trim(space);

        expect(contentful.deleteEntity).toHaveBeenCalledWith(entries[0]);
        expect(contentful.deleteEntity).not.toHaveBeenCalledWith(entries[1]);

        expect(outdatedEntryTrimmer.stats.deletedCount).toBe(1);
    }));

    it('keeps entries without a date', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().get()
        );

        linkedEntryIdCollector.entryIds = new Set();

        await outdatedEntryTrimmer.trim(space);

        expect(contentful.deleteEntity).not.toHaveBeenCalledWith(entries[0]);

        expect(outdatedEntryTrimmer.stats.deletedCount).toBe(0);
    }));

    it('skips outdated entries in grace period', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withField('endDate', new Date(new Date() - 1e4)).get()
        );

        contentful.isInGracePeriod = jasmine.createSpy('contentful.isInGracePeriod').and.callFake(entry => entry === entries[1]);

        linkedEntryIdCollector.entryIds = new Set();

        await outdatedEntryTrimmer.trim(space);

        expect(contentful.deleteEntity).toHaveBeenCalledWith(entries[0]);
        expect(contentful.deleteEntity).not.toHaveBeenCalledWith(entries[1]);

        expect(outdatedEntryTrimmer.stats.deletedCount).toBe(1);
    }));

    it('deletes entries linked in outdated entries', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withId('outdated').withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withId('linked').get()
        );

        defineLinkedEntries(new Map([
            ['outdated', ['linked']]
        ]));

        await outdatedEntryTrimmer.trim(space);

        for (const entry of entries) {
            expect(contentful.deleteEntity).toHaveBeenCalledWith(entry);
        }
    }));

    it('deletes entries linked indirectly in outdated entries', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withId('outdated').withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withId('linked1').get(),
            MockEntryBuilder.create().withId('linked2').get()
        );

        defineLinkedEntries(new Map([
            ['outdated', ['linked1']],
            ['linked1', ['linked2']]
        ]));

        await outdatedEntryTrimmer.trim(space);

        expect(contentful.deleteEntity).toHaveBeenCalledWith(entries[2]);
    }));

    it('keeps entries linked in current entries', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withId('outdated').withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withId('current').withField('endDate', new Date(+new Date() + 1e4)).get(),
            MockEntryBuilder.create().withId('linked').get()
        );

        defineLinkedEntries(new Map([
            ['outdated', ['linked']],
            ['current', ['linked']],
        ]));

        await outdatedEntryTrimmer.trim(space);

        expect(contentful.deleteEntity).not.toHaveBeenCalledWith(entries[2]);
    }));

    it('keeps entries linked indirectly in current entries', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withId('outdated').withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withId('current').withField('endDate', new Date(+new Date() + 1e4)).get(),
            MockEntryBuilder.create().withId('linked1').get(),
            MockEntryBuilder.create().withId('linked2').get()
        );

        defineLinkedEntries(new Map([
            ['outdated', ['linked2']],
            ['current', ['linked1']],
            ['linked1', ['linked2']]
        ]));

        await outdatedEntryTrimmer.trim(space);

        expect(contentful.deleteEntity).not.toHaveBeenCalledWith(entries[3]);
    }));

    it('can handle circular dependencies', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withId('outdated').withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withId('linked').get()
        );

        defineLinkedEntries(new Map([
            ['outdated', ['linked']],
            ['linked', ['outdated']]
        ]));

        await outdatedEntryTrimmer.trim(space);

        for (const entry of entries) {
            expect(contentful.deleteEntity).toHaveBeenCalledWith(entry);
        }
    }));

    it('deletes entries in reverse order to allow for resuming after failure', testAsync(async function () {
        entries.push(
            MockEntryBuilder.create().withId('outdated').withField('endDate', new Date(new Date() - 1)).get(),
            MockEntryBuilder.create().withId('linked1').get(),
            MockEntryBuilder.create().withId('linked2').get()
        );

        defineLinkedEntries(new Map([
            ['outdated', ['linked1']],
            ['linked1', ['linked2']]
        ]));

        await outdatedEntryTrimmer.trim(space);

        entries.reverse();

        const deletedEntries = contentful.deleteEntity.calls.allArgs().map(args => args[0]);

        expect(deletedEntries).toEqual(entries);
    }));
});
