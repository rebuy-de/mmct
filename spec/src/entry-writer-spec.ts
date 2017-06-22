import * as entryWriter from '../../src/entry-writer';
import * as contentful from '../../src/contentful';
import {ContentType, Entry, Space} from 'contentful-management'
import {buildMockContentType} from '../mock/mock-content-type-builder';
import {buildMockEntry} from '../mock/mock-entry-builder';
import {testAsync} from '../helper';

describe('entryWriter', function () {
    describe('fillDefaultValue', function () {
        let contentType: ContentType;
        let entries: Entry[];

        const fieldName = 'fieldName';
        const value = 'value';
        const modelId = 'model-id';
        const space = <Space>{};

        beforeEach(function () {
            entries = [];

            spyOn(contentful, 'getEntries').and.callFake(() => entries);
            spyOn(contentful, 'getLocales').and.callFake(() => ({
                items: [
                    {code: 'en', default: true},
                    {code: 'fr'}
                ]
            }));
            spyOn(contentful, 'getContentType').and.callFake(() => contentType);
            spyOn(contentful, 'updateEntity');

            contentType = buildMockContentType('model-id').withField(fieldName, 'Symbol').get();
        });

        it('updates entries with the correct value', testAsync(async function () {
            entries.push(
                buildMockEntry().get(),
                buildMockEntry().get()
            );

            const stats = await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

            for (const entry of entries) {
                expect(entry.fields[fieldName]).toEqual({'en': value});
                expect(contentful.updateEntity).toHaveBeenCalledWith(entry);
            }

            expect(stats.updatedCount).toBe(2);
        }));

        it('updates all languages for a localized field', testAsync(async function () {
            entries.push(
                buildMockEntry().get(),
                buildMockEntry().get()
            );

            contentType.fields.find(field => field.id === fieldName).localized = true;

            await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

            for (const entry of entries) {
                expect(entry.fields[fieldName]).toEqual({'en': value, 'fr': value});
            }
        }));

        it('ignores entries already containing the field', testAsync(async function () {
            entries.push(
                buildMockEntry().withField(fieldName, 'some value').get()
            );

            const stats = await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

            expect(entries[0].fields[fieldName]).toEqual({'en': 'some value'});
            expect(contentful.updateEntity).not.toHaveBeenCalled();
            expect(stats.updatedCount).toBe(0);
        }));

        it('throws proper error if content type does not exist', testAsync(async function () {
            (<jasmine.Spy>contentful.getContentType).and.callFake(() => {
                throw {name: 'NotFound'};
            });

            try {
                await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

                fail('Expected entryWriter.fillDefaultValue to throw an exception.');
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching(modelId));
            }
        }));

        it('throws if field is missing in content type', testAsync(async function () {
            contentType = buildMockContentType('model-id').get();

            try {
                await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

                fail('Expected entryWriter.fillDefaultValue to throw an exception.');
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching(fieldName));
            }
        }));

        it('throws if field type is not text', testAsync(async function () {
            contentType = buildMockContentType('model-id').withField(fieldName, 'Link').get();

            try {
                await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

                fail('Expected entryWriter.fillDefaultValue to throw an exception.');
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching(fieldName));
            }
        }));

        it('throws if editing field is disabled', testAsync(async function () {
            contentType.fields.find(field => field.id === fieldName).disabled = true;

            try {
                await entryWriter.fillDefaultValue(space, modelId, fieldName, value);

                fail('Expected entryWriter.fillDefaultValue to throw an exception.');
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching(fieldName));
            }
        }));
    });

    describe('copyValue', function () {
        let contentType: ContentType;
        let entries: Entry[];

        const modelId = 'model-id';
        const space = <Space>{};

        beforeEach(function () {
            entries = [];

            spyOn(contentful, 'getEntries').and.callFake(() => entries);
            spyOn(contentful, 'getContentType').and.callFake(() => contentType);
            spyOn(contentful, 'updateEntity');

            contentType = buildMockContentType('model-id')
                .withField('src', 'Symbol')
                .withField('dest', 'Text')
                .get();
        });

        it('copies values', testAsync(async function () {
            entries.push(
                buildMockEntry().withField('src', 'value').get(),
                buildMockEntry().withField('src', 'value').withField('dest', 'different value').get()
            );

            const stats = await entryWriter.copyValue(space, modelId, 'src', 'dest');

            for (const entry of entries) {
                expect(entry.fields['dest']).toEqual({'en': 'value'});
                expect(contentful.updateEntity).toHaveBeenCalledWith(entry);
            }

            expect(stats.updatedCount).toBe(2);
        }));

        it('throws if source field is missing in content type', testAsync(async function () {
            contentType = buildMockContentType('model-id').withField('dest', 'Symbol').get();

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('src'));
            }
        }));

        it('throws if destination field is missing in content type', testAsync(async function () {
            contentType = buildMockContentType('model-id').withField('src', 'Symbol').get();

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('dest'));
            }
        }));

        it('throws if destination field is disabled', testAsync(async function () {
            contentType.fields.find(field => field.id === 'dest').disabled = true;

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('dest'));
            }
        }));

        it('throws if source field is localized but destination field is not', testAsync(async function () {
            contentType.fields.find(field => field.id === 'src').localized = true;

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('src'));
                expect(e.message).toEqual(jasmine.stringMatching('dest'));
            }
        }));

        it('throws if source field is not localized but destination field is', testAsync(async function () {
            contentType.fields.find(field => field.id === 'dest').localized = true;

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('src'));
                expect(e.message).toEqual(jasmine.stringMatching('dest'));
            }
        }));

        it('throws if source field does not have a text type', testAsync(async function () {
            contentType.fields.find(field => field.id === 'src').type = 'Link';

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('src'));
            }
        }));

        it('throws if destination field does not have a text type', testAsync(async function () {
            contentType.fields.find(field => field.id === 'dest').type = 'Link';

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {
                expect(e.message).toEqual(jasmine.stringMatching('dest'));
            }
        }));

        it('throws if trying to copy long text into short text', testAsync(async function () {
            contentType = buildMockContentType('model-id')
                .withField('src', 'Text')
                .withField('dest', 'Symbol')
                .get();

            try {
                await entryWriter.copyValue(space, modelId, 'src', 'dest');
                fail();
            } catch (e) {}
        }));
    });
});
