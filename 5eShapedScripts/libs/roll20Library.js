var state = {
	ShapedScripts: {
		config: {}
	}
};
function createObj(type, attributes) {
	return _.chain(attributes)
			.clone()
			.defaults({
					type:type,
					id:"MYID",
					get: _.constant(""),
					set: _.noop(),
					remove: _.noop()})
			.value();
}

function findObjs(attributes) {
	return [];
}

function getObj(type, id) {
	return createObj(type, {id:id});
}

function getAttrByName(character, attrName) {
	return "";
}

function sendChat(as, message, callback) {
	if(callback) {
		callback([{inlinerolls:[{results:{total:0}}]}])
	}
}

function on(event, callback) {

}
