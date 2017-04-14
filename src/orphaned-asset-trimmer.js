const AssetIdCollector = require('./asset-id-collector');
const contentful = require('./contentful');
const EntryTraverser = require('./entry-traverser');
const promiseAll = require('sync-p/all');

module.exports = class OrphanedAssetTrimmer {
    trim(space) {
        this.stats = {
            deletedCount: 0
        };

        return contentful.getEntries(space)
            .then(entries => this.collectAssetIds(entries))
            .then(() => contentful.getAssets(space))
            .then(assets => this.deleteUnusedAssets(assets))
            .then(() => this.stats);
    }

    collectAssetIds(entries) {
        const entryTraverser = new EntryTraverser();
        const assetIdCollector = new AssetIdCollector();

        entryTraverser.traverse(entries, assetIdCollector);
        
        this.usedAssetIds = assetIdCollector.assetIds;
    }

    deleteUnusedAssets(assets) {
        const unusedAssets = assets.filter(asset => !this.isInUse(asset));

        return promiseAll(unusedAssets.map(asset => this.deleteAsset(asset)));
    }

    isInUse(asset) {
        if (this.usedAssetIds.has(asset.sys.id)) {
            return true;
        }

        if (contentful.isInGracePeriod(asset)) {
            return true;
        }
        
        return false;
    }

    deleteAsset(asset) {
        this.stats.deletedCount ++;

        return contentful.deleteEntity(asset);
    }
}