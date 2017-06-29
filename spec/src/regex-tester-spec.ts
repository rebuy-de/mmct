import {testRegex} from '../../src/regex-tester';
import * as contentful from '../../src/contentful';
import {Entry, Space} from 'contentful-management';
import * as inquirer from 'inquirer';
import {buildMockEntry} from '../mock/mock-entry-builder';
import * as logger from '../../src/logger';

describe('regexTester', function () {
    describe('test', function () {
        let space = <Space>{};
        let entries: Entry[];
        let flags: string;
        let regex: string;

        beforeEach(function () {
            entries = [];
            regex = '.';
            flags = '';

            spyOn(logger, 'info');

            spyOn(contentful, 'getEntries').and.returnValue(new Promise(resolve => resolve(entries)));

            spyOn(inquirer, 'prompt').and.callFake(() => new Promise(resolve => resolve({
                regex: regex,
                flags: flags
            })));
        });

        it('tests the regex against fields', async function () {
            regex = '^a+';

            entries.push(
                buildMockEntry('model-id').withId('entry1').withField('field', 'aaaa').get(),
                buildMockEntry('model-id').withId('entry2').withField('field', 'baaa').get()
            );

            const stats = await testRegex(space, 'model-id', 'field');

            expect(logger.info).toHaveBeenCalledTimes(1);
            expect((<jasmine.Spy>logger.info).calls.argsFor(0)[0]).toContain('entry2');

            expect(stats).toEqual({
                matchedCount: 1,
                testedCount: 2
            });
        });

        it('filters by content type', async function () {
            await testRegex(space, 'model-id', 'field');

            expect(contentful.getEntries).toHaveBeenCalledWith(space, {content_type: 'model-id'});
        });

        it('tests all locales in a field', async function () {
            regex = 'a';

            entries.push(buildMockEntry('model-id').get());
            entries[0].fields['field'] = {
                'en': 'b',
                'fr': 'b',
            };

            const stats = await testRegex(space, 'model-id', 'field');

            expect(logger.info).toHaveBeenCalledTimes(2);
            expect((<jasmine.Spy>logger.info).calls.argsFor(0)[0]).toContain('‘en’');
            expect((<jasmine.Spy>logger.info).calls.argsFor(1)[0]).toContain('‘fr’');

            expect(stats).toEqual({
                matchedCount: 0,
                testedCount: 1
            });
        });

        it('ignores the ‘g’ flag', async function () {
            regex = '^.+$';
            flags = 'g';

            entries.push(
                buildMockEntry('model-id').withId('entry1').withField('field', 'aa').get(),
                buildMockEntry('model-id').withId('entry2').withField('field', 'aa').get()
            );

            await testRegex(space, 'model-id', 'field');

            expect(logger.info).not.toHaveBeenCalled();
        });

        it('throws on invalid regex', async function () {
            regex = '[\d+';

            try {
                await testRegex(space, 'model-id', 'field');
                fail();
            } catch (e) {
                expect(e.message).toContain(regex);
            }
        });

        it('logs for missing field', async function () {
            entries.push(buildMockEntry('model-id').withId('entry1').get());

            await testRegex(space, 'model-id', 'field');

            expect((<jasmine.Spy>logger.info).calls.argsFor(0)[0]).toContain('entry1');
        });
    });
});
