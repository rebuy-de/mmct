MMCT
==============================

Toolset for [contentful](https://www.contentful.com/) space management.

## Installation

* Install node >= 7.6
* run `npm install -g https://github.com/veu/mmct`

## Getting started

When running a command for the first time you will be prompted to enter the OAuth token and other required information.
Once entered it will be stored in the config file located at `~/.config/configstore/MMCT.json`.
To simplify this process, run the following command to enter all config values at once.

```
mmct-init
```

Alternatively, you can create the config file manually.

## Usage

### Trimming content

The following commands delete expired or unused content from a contentful space.

#### Delete drafts

Deletes all entries that have never been published.

```
mmct-trim drafts <space-id> [--grace-period <days>] [--dry-run]
```

* **--grace-period** Keep all entries that have been updated within the last `<days>`. Default: config value
* **--dry-run** Don’t delete anything but list what would have been deleted.

#### Delete outdated entries

Deletes all entries with an expiry date in the past and entries linked in expired entries and not anywhere else.

```
mmct-trim outdated-entries <space-id> <expiry-field> [--grace-period <days>] [--dry-run]
```

* **expiry-field** The name of the field containing the expiration date of the entry.
* **--grace-period** Keep all entries that have been updated within the last `<days>`. Default: config value
* **--dry-run** Don’t delete anything but list what would have been deleted.

#### Delete orphaned assets

Deletes all assets that are not linked in any entries. Best used after the previous command.

```
mmct-trim orphaned-assets <space-id> [--grace-period <days>] [--dry-run]
```

* **--grace-period** Keep all entries that have been updated within the last `<days>`. Default: config value
* **--dry-run** Don’t delete anything but list what would have been deleted.

#### Delete orphaned entries

Deletes all entries of the given content model that are not linked in any entries.
Useful if you have entries that are only used as links in other entries.

```
mmct-trim orphaned-entries <space-id> <content-model-id> [--grace-period <days>] [--dry-run]
```

* **content-model-id** Content model ID of the entries to delete.
* **--grace-period** Keep all entries that have been updated within the last `<days>`. Default: config value
* **--dry-run** Don’t delete anything but list what would have been deleted.

### Filling entries

The following commands enter data for multiple entries at once.

#### Fill default value

Added a text field to a content model and need to update existing entries?
Use this command to add a value for all entries of the model that are missing the field.
If the field is localized, all language versions will be set to the same value.

Previously published entries without pending changes will be published again after updating.

```
mmct-fill default-value <space-id> <content-model-id> <field> <value>
```

* **content-model-id** Content model ID of the entries to update.
* **field** Name of the field to fill.
* **value** Text to enter.

### Copying

The following commands copy data for multiple entries at once.

#### Copy value

Copies the text value in the source field to the destination field for all entries of the model.

Previously published entries without pending changes will be published again after updating.

```
mmct-copy value <space-id> <content-model-id> <src-field> <dest-field>
```

* **content-model-id** Content model ID of the entries to update.
* **src-field** Name of the field to copy the value.
* **dest-field** Name of the field to paste the value.

### Testing

#### Test a regular expression

Tests a regular expression against all entries of a content type.
Use this command to make sure that existing entries match a new validation for content editing.

```
mmct-test regex <space-id> <content-model-id> <field>
```

* **content-model-id** Content model ID of the entries to check.
* **field** Name of the field to check.
