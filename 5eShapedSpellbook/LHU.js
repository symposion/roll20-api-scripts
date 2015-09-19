var LHU = LHU || function() {
    'use strict';
    
    var mixins = {
        matcher: function(attrs) {
            attrs = _.extendOwn({}, attrs);
            return function(obj) {
                return _.isMatch(obj, attrs);
            }
        },
        
        extendOwn: (function(keysFunc, undefinedOnly) {
            return function(obj) {
                var length = arguments.length;
                if (length < 2 || obj == null) return obj;
                for (var index = 1; index < length; index++) {
                    var source = arguments[index],
                        keys = keysFunc(source),
                        l = keys.length;
                    for (var i = 0; i < l; i++) {
                        var key = keys[i];
                        if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
                    }
                }
                return obj;
            }
        })(_.keys),
        
        isMatch: function(object, attrs) {
            var keys = _.keys(attrs), length = keys.length;
            if (object == null) return !length;
            var obj = Object(object);
            for (var i = 0; i < length; i++) {
                var key = keys[i];
                if (attrs[key] !== obj[key] || !(key in obj)) return false;
            }
            return true;
        },
        
        constant: function(value) {
            return function() {
                return value;
            };
        }
    };

    var getObjectMapperFunc = function(idResolver, type, subtype) {
        return function(object) {
            var id = idResolver(object);
            var obj = getObj(type, id);
            if(obj && (_.isUndefined(subtype) || obj.get('subtype') === subtype)) {
                return obj;
            }
            return null;
        }
    },
    
    getPropertyResolver = function(property) {
        return function(object) {
            return object[property] || object.get(property);
        }  
    },
    
    
    logTap = function(object) { log(object) },
    
    ensureMixins = function() {
        if(!_.has(_, 'matcher')) {
            log('Adding mixins to simulate later version of underscore.js');
            _.mixin(mixins);
        }
    },
    
    firstOrNull = function(array) {
        return _.isEmpty(array) ? null : _.first(array);
    };
    
    isNPCToken = function (obj) {
        if(obj.get('subtype') === 'token') {
            var represents = obj.get('represents');
            if (represents !== 'undefined' && represents !== '') {
               var result = (getAttrByName(represents, 'is_npc') == 1);
               return result;
            }
        }
        return false;
    }
    
    return { 
        getObjectMapperFunc: getObjectMapperFunc, 
        logTap: logTap, 
        getPropertyResolver: getPropertyResolver, 
        ensureMixins: ensureMixins,
        firstOrNull: firstOrNull,
        isNPCToken: isNPCToken
        
    };
}();
