'use strict'

/**
 * Module dependencies.
 */

const faker = require('faker')
const cloneDeep = require('lodash.clonedeep')

/**
 * Helper functions.
 */

const isType = (value, type) => typeof value === type
const isObject = value => isType(value, 'object')
const generateArrayOfLength = length => [...new Array(length)]
const isObjectKey = (key, object) => Object.keys(object).includes(key)

/**
 * Returns Faker.js generated data.
 *
 * @param {String} topic
 * @param {String} subtopic
 * @returns {String|Number|Object} Fake Data
 * @api private
 */

const generateFakerData = (topic, subtopic) => {
	if (topic === 'fake') {
		return faker[topic](subtopic.slice(1, -1))
	}

	return faker[topic][subtopic]()
}

/**
 * Parses function payload to the appropriate topic and subtopic.
 *
 * @param {String} payload
 * @returns {Array} [Topic, Subtopic]
 * @api private
 */

const parsePayload = payload => {
	let topic
	let subtopic
	payload = String(payload)
	if (payload.startsWith('fake')) {
		topic = 'fake';
		[, subtopic] = payload.split(topic)
	} else {
		[topic, subtopic] = payload.split(/\.(.+)/)
	}

	return [topic, subtopic]
}

/**
 * Returns the appropriate fake data
 * (generated using either Faker.js or custom functions).
 *
 * @param {String} payload
 * @param {Object} customFunctions
 * @returns {String|Number|Object} Fake Data
 * @api private
 */

const fake = (payload, customFunctions) => {
	let numOfValues = null
	let [topic, subtopic] = parsePayload(payload)
	if (subtopic && subtopic.includes('|')) {
		[subtopic, numOfValues] = subtopic.split('|')
		numOfValues = parseInt(numOfValues, 10)
	} else if (!subtopic && topic && topic.includes('|')) {
		[topic, numOfValues] = topic.split('|')
		numOfValues = parseInt(numOfValues, 10)
	}

	if (isObjectKey(topic, customFunctions)) {
		const func = customFunctions[topic]
		if (numOfValues) {
			if (func[subtopic] !== undefined) {
				return generateArrayOfLength(numOfValues).map(_ => func[subtopic]())
			}

			return generateArrayOfLength(numOfValues).map(_ => func())
		}

		if (func[subtopic]) {
			return func[subtopic]()
		}

		return func()
	}

	if (!subtopic || ((faker[topic] === undefined || faker[topic][subtopic] === undefined) && !subtopic.includes('.') && !subtopic.includes('|'))) {
		subtopic = subtopic ? '.' + subtopic : ''
		throw new Error(`Function ${JSON.stringify(topic + subtopic)} does not exist`)
	}

	if (numOfValues) {
		return generateArrayOfLength(numOfValues).map(_ => generateFakerData(topic, subtopic))
	}

	return generateFakerData(topic, subtopic)
}

/**
 * Populates the template object with fake data.
 *
 * @param {String} object
 * @param {String} funcObject
 * @param {Boolean} firstRun
 * @returns {Object} Populated Object
 * @api private
 */

const populateObject = (object, funcObject, firstRun = true) => {
	object = cloneDeep(object)
	const repeatParentObject = firstRun && isObjectKey('_repeat', object) && object._repeat !== undefined
	for (let [key, value] of Object.entries(object)) {
		if (repeatParentObject) {
			value = object
		}

		if (isObject(value)) {
			if (value._repeat) {
				const repeatCount = value._repeat
				delete value._repeat
				if (repeatParentObject) {
					const temp = object
					object = []
					for (let j = 0; j < repeatCount; j++) {
						object.push(populateObject(temp, funcObject, false))
					}

					return object
				}

				object[key] = []
				for (let j = 0; j < repeatCount; j++) {
					object[key].push(populateObject(value, funcObject, false))
				}
			} else {
				object[key] = populateObject(value, funcObject, false)
			}
		} else {
			object[key] = fake(value, funcObject)
		}
	}

	return object
}

const jaymock = () => new JayMock()

/**
 * Expose `jaymock`.
 */

module.exports = jaymock

/**
 * Initializes `JayMock`.
 *
 * @method jaymock
 * @api public
 */

function JayMock() {
	this.template = {}
	this.functions = {}
}

/**
 * Populates the template object with fake data.
 *
 * @method jaymock.populate
 * @param {Object} template
 * @returns {Object} Populated Object
 * @api public
 */

JayMock.prototype.populate = function (template) {
	this.template = template
	return populateObject(this.template, this.functions)
}

/**
 * Adds custom data generation function(s).
 *
 * @method jaymock.extend
 * @param {String|Object} funcName
 * @param {?String} funcBody
 * @api public
 */

JayMock.prototype.extend = function (funcName, funcBody) {
	if (isObject(funcName) && !funcBody) {
		this.functions = funcName
	} else {
		this.functions[funcName] = funcBody
	}
}

/**
 * Sets `Faker.js`'s language locale.
 *
 * @method jaymock.setFakerLocale
 * @param {String} locale
 * @api public
 */

JayMock.prototype.setFakerLocale = function (locale) {
	faker.locale = locale
}

/**
 * Sets `Faker.js`'s randomness seed.
 *
 * @method jaymock.setFakerSeed
 * @param {Number} seed
 * @api public
 */

JayMock.prototype.setFakerSeed = function (seed) {
	faker.seed(seed)
}
