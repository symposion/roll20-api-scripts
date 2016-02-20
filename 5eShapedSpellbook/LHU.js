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
    },
    
    isNPCToken = function (obj) {
        if(obj.get('subtype') === 'token') {
            var represents = obj.get('represents');
            if (represents !== 'undefined' && represents !== '') {
               var result = (getAttrByName(represents, 'is_npc') == 1);
               return result;
            }
        }
        return false;
    },
    
    instrumentWithProfiler = function (object) {
        
        _.chain(object).functions().each(function(functionName) {
            var oldFunction = object[functionName];
            var profileData = {
                runCount:0,
                totalExecutionTime:0,
                executions:[]
            };
            var newFunction = function() {
                var startTime = Date.now();
                var retVal = oldFunction.apply(this, arguments);
                var endTime = Date.now();
                profileData.runCount++;
                profileData.totalExecutionTime += (endTime - startTime);
                profileData.executions.push([startTime, endTime, arguments]);
                return retVal;
            };
            
            newFunction.profileData = profileData
            newFunction.originalFunction = oldFunction;
            object[functionName] = newFunction;
        });
        
        object.logProfileData = function() {
             _.chain(this).functions().map(function(functionName) {
                return this[functionName];
             })
             .sortBy(function(funcObject) {
                return funcObject.profileData.totalExecutionTime;
             })
             .each(function(functionName) {
                var profileData = this[functionName].profileData
                log("***********************************************");
                log("* Profile Data for " + functionName);
                log("*");
                log("* Total Execution Time: " + profileData.totalExecutionTime);
                log("* Run Count: " + profileData.runCount);
                log("* Average Execution Time: " + profileData.totalExecutionTime / profileData.runCount);
                log("***********************************************"); 
             });
        };
        
        object.resetProfilingData = function() {
            _.chain(this).functions().each(function(functionName) {
                var profileData = this[functionName].profileData;
                profileData.runCount = 0;
                profileData.totalExecutionTime = 0;
                executions = [];
             });   
        };
        
        object.deInstrument = function() {
             _.chain(this).functions().each(function(functionName) {
                this[functionName] = this[functionName].originalFunction; 
             });
             delete this.logProfileData;
             delete this.deInstrument;
        }
    },
    
    ch = function (c) {
    	var entities = {
			'<' : 'lt',
			'>' : 'gt',
			"'" : '#39',
			'@' : '#64',
			'{' : '#123',
			'|' : '#124',
			'}' : '#125',
			'[' : '#91',
			']' : '#93',
			'"' : 'quot',
			'-' : 'mdash',
			' ' : 'nbsp'
		};

		if(_.has(entities,c) ){
			return ('&'+entities[c]+';');
		}
		return '';
	};
    
    return { 
        getObjectMapperFunc: getObjectMapperFunc, 
        logTap: logTap, 
        getPropertyResolver: getPropertyResolver, 
        ensureMixins: ensureMixins,
        firstOrNull: firstOrNull,
        isNPCToken: isNPCToken,
        ch:ch
        
    };
}();

on("ready",function(){
    'use strict';

        on('chat:message', function(msg){
            if(msg.content === '!dump-obj') {
                sendChat('', JSON.stringify(_.map(msg.selected, function(obj){ return getObj(obj._type, obj._id)})));
            }
        });
});
