"use strict";
/* @flow */

const Value = require('../Value');
const Variable = require('./Variable');
const CompletionRecord = require('../CompletionRecord');

/**
 * Represents a value that maps directly to an untrusted local value.
 */
class ObjectValue extends Value {
	
	constructor(env) {
		super(env);
		this.env = env;
		this.properties = Object.create(null);
		this.setPrototype(this.env.ObjectPrototype);
	}

	ref(name) {
		if ( Object.prototype.hasOwnProperty.call(this.properties, name) ) {
			return this.properties[name];
		}
		var existing = this.properties[name];
		var ret = {set: (v) => this.set(name,v)};
		let get;
		if ( existing ) {
			Object.defineProperty(ret, 'value', {
				get: () => existing.value,
				set: (v) => {
					this.set(name, v);
				}
			});

		} else {
			Object.defineProperty(ret, 'value', {
				get: () => Value.undef,
				set: (v) => {
					this.set(name, v);
				}
			});
		}
		return ret;
	}

	assign(name, value) {
		return this.set(name, value);
	}

	get(name) {
		let ref = this.properties[name];
		if ( ref ) return ref.value;
		return Value.undef;
	}

	rawSetProperty(name, value) {
		this.properties[name] = value;
	}

	set(name, value) {
		var v = new Variable(value, this);
		v.del = () => this.delete(name);
		this.properties[name] = v;
	}

	has(name) {
		return name in this.properties;
	}

	delete(name) {
		delete this.properties[name];
	}
	
	toNative() {
		return Value.createNativeBookmark();
	}


	*add(other) { return yield * (yield * this.toPrimitiveValue()).add(other); }

	*inOperator(str) {
		let svalue = yield * str.toStringValue();
		return this.has(svalue.toNative()) ? Value.true : Value.false;
	}

	*member(name) { 
		let ref = this.ref(name);
		if ( ref ) return ref.value;
		return Value.undef;
	}

	*instanceOf(other, env) {
		let target = yield * other.member('prototype');
		let pt = this.getPrototype(env);
		let checked = [];

		while ( pt ) {
			if ( pt === target ) return Value.true;
			checked.push(pt);
			pt = pt.getPrototype();
			if ( checked.indexOf(pt) !== -1 ) return Value.false;
		}
		return Value.false;
	}

	*observableProperties() {
		for ( var p in this.properties ) {
			if ( !this.properties[p].enumerable ) return;
			yield this.fromNative(p);
		}
		return;
	}

	hasOwnProperty(name) {
		return Object.prototype.hasOwnProperty.call(this.properties, name);
	}

	setPrototype(val) {
		if ( val == null ) {
			Object.setPrototypeOf(this.properties, null);	
			return;
		}
		this.proto = val;
		Object.setPrototypeOf(this.properties, val.properties);
	}

	getPrototype() {
		return this.proto;
	}

	*toPrimitiveValue(preferedType) { 
		let methodNames;
		if ( preferedType == 'string') {
			methodNames = ['toString', 'valueOf'];
		} else {
			methodNames = ['valueOf', 'toString'];
		}

		for ( let name of methodNames ) {
			let method = yield * this.member(name);
			if ( method && method.call ) {
				let rescr = yield (yield * method.call(this, [], this.env.evaluator));
				let res = Value.undef;
				if ( !(rescr instanceof CompletionRecord) ) res = rescr;
				else if ( rescr.type == CompletionRecord.RETURN ) res = rescr.value;
				else if ( rescr.type != CompletionRecord.NORMAL ) continue;
				if ( res.specTypeName !== 'object' ) return res;
			}
		}
		throw new TypeError('Cannot convert object to primitive value');
	}

	*toNumberValue() { 
		let prim = yield * this.toPrimitiveValue('number');
		return yield * prim.toNumberValue();
	}


	*toStringValue() { 
		let prim = yield * this.toPrimitiveValue('string');
		return yield * prim.toNumberValue();
	}

	get truthy() {
		return true;
	}

	get jsTypeName() {
		if ( typeof this.call !== "function" ) return "object";
		return "function";
	}
}

module.exports = ObjectValue;