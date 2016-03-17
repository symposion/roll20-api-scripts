var _ = require('underscore');

//noinspection JSUnusedGlobalSymbols
module.exports = {
    state: {
        ShapedScripts: {
            config: {}
        }
    },

    getState: function () {
        'use strict';
        return this.state;
    },

    createObj: function (type, attributes) {
        'use strict';
        return _.chain(attributes)
            .clone()
            .defaults({
                type: type,
                id: 'MYID',
                get: _.constant(''),
                set: _.noop(),
                remove: _.noop()
            })
            .value();
    },

    findObjs: function (attributes) {
        'use strict';
        return [];
    },

    getObj: function (type, id) {
        'use strict';
        return this.createObj(type, {id: id});
    },

    getAttrByName: function (character, attrName) {
        'use strict';
        return '';
    },

    sendChat: function (as, message, callback) {
        'use strict';
        if (callback) {
            callback([{inlinerolls: [{results: {total: 0}}]}]);
        }
    },

    on: function (event, callback) {
        'use strict';

    }
};
