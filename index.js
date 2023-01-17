'use strict';
const path = require('path');
const resolveFrom = require('resolve-from');
const parentModule = require('parent-module');

const resolve = (moduleId, options = {}) => {
	const basePath = options.basePath || path.dirname(parentModule(__filename));

	try {
		return resolveFrom(basePath, moduleId);
	} catch (_) {}
};

const clear = (moduleId, options = {}) => {
	const { regex, isExclusiveFilter = false } = options;

	if (typeof moduleId !== 'string') {
		throw new TypeError(`Expected a \`string\`, got \`${typeof moduleId}\``);
	}

	const filePath = resolve(moduleId, options);

	if (!filePath) {
		return
	}

	if (regex) {
		const moduleMatches = regex.test(filePath);
		const shouldSkipModule = isExclusiveFilter ? moduleMatches : !moduleMatches;

		if (shouldSkipModule) {
			return;
		}
	}

	// Delete itself from module parent
	if (require.cache[filePath] && require.cache[filePath].parent) {
		let i = require.cache[filePath].parent.children.length;

		while (i--) {
			if (require.cache[filePath].parent.children[i].id === filePath) {
				require.cache[filePath].parent.children.splice(i, 1);
			}
		}
	}

	// Remove all descendants from cache as well
	if (require.cache[filePath]) {
		let children = require.cache[filePath].children.map(child => child.id);

		// Filter out children not matching regex (if provided)
		if (regex) {
			children = children.filter(moduleId => {
				const modulePath = resolve(moduleId, options);
				const moduleMatches = regex.test(modulePath);
				return isExclusiveFilter ? !moduleMatches : moduleMatches;
			});
		}

		// Delete module from cache
		delete require.cache[filePath];

		for (const id of children) {
			clear(id, options);
		}
	}
};

clear.all = (options = {}) => {
	const { regex, isExclusiveFilter = false } = options;
	const directory = path.dirname(parentModule(__filename));

	for (const moduleId of Object.keys(require.cache)) {
		if (regex) {
			const moduleMatches = regex.test(moduleId);
			const shouldSkipModule = isExclusiveFilter ? moduleMatches : !moduleMatches;

			if (shouldSkipModule) {
				continue;
			}
		}

		delete require.cache[resolveFrom(directory, moduleId)];
	}
};

clear.match = regex => {
	for (const moduleId of Object.keys(require.cache)) {
		if (regex.test(moduleId)) {
			clear(moduleId);
		}
	}
};

clear.single = moduleId => {
	if (typeof moduleId !== 'string') {
		throw new TypeError(`Expected a \`string\`, got \`${typeof moduleId}\``);
	}

	delete require.cache[resolve(moduleId)];
};

module.exports = clear;
