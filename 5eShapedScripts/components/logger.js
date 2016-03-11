
logger = (function () {
	var logger = {
		OFF: 0,
		ERROR: 1,
		WARN: 2,
		INFO: 3,
		DEBUG: 4,
		TRACE: 5,
		prefixString: ''
	};

	var log = log || console.log;

	logger.getLabel = function (logLevel) {
		var logPair = _.chain(this).pairs().find(function (pair) {
			return pair[1] === logLevel;
		}).value();
		return logPair ? logPair[0] : 'UNKNOWN';
	};

	var stringify = function (object) {
		if (typeof object === 'undefined') return object;
		var result = (typeof object === 'string') ? object : JSON.stringify(object, function(key, value) {
			if(key !== 'logWrap' && key !== 'isLogWrapped') {
				return value;
			}
		});
		if (result) result = result.replace(/"/g, '');
		return result;
	};

	var shouldLog = function (level) {
		var logLevel = logger.INFO;
		if (myState && myState.config && myState.config.logLevel) {
			logLevel = logger[myState.config.logLevel]
		}

		return level <= logLevel;
	};

	var outputLog = function (level, message) {

		if (!shouldLog(level)) return;

		var args = arguments.length > 2 ? _.toArray(arguments).slice(2) : [];
		message = stringify(message);
		if (message) {
			message = message.replace(/\$\$\$/g, function () {
				return stringify(args.shift());
			});
		}
		log('ShapedScripts ' + Date.now()
			+ ' ' + logger.getLabel(level) + ' : '
			+ (shouldLog(logger.TRACE) ? logger.prefixString : '')
			+ message);
	};

	_.each(logger, function (level, levelName) {
		logger[levelName.toLowerCase()] = _.partial(outputLog.bind(logger), level);
	});

	logger.wrapModule = function (modToWrap) {
		if (shouldLog(logger.TRACE)) {
			_.chain(modToWrap)
				.functions()
				.each(function (funcName) {
					var origFunc = modToWrap[funcName];
					modToWrap[funcName] = logger.wrapFunction(funcName, origFunc, modToWrap.logWrap);
				});
			modToWrap.isLogWrapped = true;
		}
	};

	logger.wrapFunction = function (name, func, moduleName) {
		if (shouldLog(logger.TRACE)) {
			if (name === 'toJSON') {
				return func;
			}
			return function () {
				logger.trace('$$$.$$$ starting with args $$$', moduleName, name, arguments);
				logger.prefixString = logger.prefixString + '  ';
				var retVal = func.apply(this, arguments);
				logger.prefixString = logger.prefixString.slice(0, -2);
				logger.trace('$$$.$$$ ending with return value $$$', moduleName, name, retVal);
				if (retVal && retVal.logWrap && !retVal.isLogWrapped) {
					logger.wrapModule(retVal);
				}
				return retVal;
			};
		}
		return func;
	};
	return logger;
})();
