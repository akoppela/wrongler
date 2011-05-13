/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

provides: [Core, MooTools, Type, typeOf, instanceOf, Native]

...
*/

(function(){

this.MooTools = {
	version: '1.3.3dev',
	build: '%build%'
};

// typeOf, instanceOf

var typeOf = this.typeOf = function(item){
	if (item == null) return 'null';
	if (item.$family) return item.$family();

	if (item.nodeName){
		if (item.nodeType == 1) return 'element';
		if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
	} else if (typeof item.length == 'number'){
		if (item.callee) return 'arguments';
		if ('item' in item) return 'collection';
	}

	return typeof item;
};

var instanceOf = this.instanceOf = function(item, object){
	if (item == null) return false;
	var constructor = item.$constructor || item.constructor;
	while (constructor){
		if (constructor === object) return true;
		constructor = constructor.parent;
	}
	return item instanceof object;
};

// Function overloading

var Function = this.Function;

var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

Function.prototype.overloadSetter = function(usePlural){
	var self = this;
	return function(a, b){
		if (a == null) return this;
		if (usePlural || typeof a != 'string'){
			for (var k in a) self.call(this, k, a[k]);
			if (enumerables) for (var i = enumerables.length; i--;){
				k = enumerables[i];
				if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
			}
		} else {
			self.call(this, a, b);
		}
		return this;
	};
};

Function.prototype.overloadGetter = function(usePlural){
	var self = this;
	return function(a){
		var args, result;
		if (usePlural || typeof a != 'string') args = a;
		else if (arguments.length > 1) args = arguments;
		if (args){
			result = {};
			for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
		} else {
			result = self.call(this, a);
		}
		return result;
	};
};

Function.prototype.extend = function(key, value){
	this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value){
	this.prototype[key] = value;
}.overloadSetter();

// From

var slice = Array.prototype.slice;

Function.from = function(item){
	return (typeOf(item) == 'function') ? item : function(){
		return item;
	};
};

Array.from = function(item){
	if (item == null) return [];
	return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
};

Number.from = function(item){
	var number = parseFloat(item);
	return isFinite(number) ? number : null;
};

String.from = function(item){
	return item + '';
};

// hide, protect

Function.implement({

	hide: function(){
		this.$hidden = true;
		return this;
	},

	protect: function(){
		this.$protected = true;
		return this;
	}

});

// Type

var Type = this.Type = function(name, object){
	if (name){
		var lower = name.toLowerCase();
		var typeCheck = function(item){
			return (typeOf(item) == lower);
		};

		Type['is' + name] = typeCheck;
		if (object != null){
			object.prototype.$family = (function(){
				return lower;
			}).hide();
			//<1.2compat>
			object.type = typeCheck;
			//</1.2compat>
		}
	}

	if (object == null) return null;

	object.extend(this);
	object.$constructor = Type;
	object.prototype.$constructor = object;

	return object;
};

var toString = Object.prototype.toString;

Type.isEnumerable = function(item){
	return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' );
};

var hooks = {};

var hooksOf = function(object){
	var type = typeOf(object.prototype);
	return hooks[type] || (hooks[type] = []);
};

var implement = function(name, method){
	if (method && method.$hidden) return;

	var hooks = hooksOf(this);

	for (var i = 0; i < hooks.length; i++){
		var hook = hooks[i];
		if (typeOf(hook) == 'type') implement.call(hook, name, method);
		else hook.call(this, name, method);
	}
	
	var previous = this.prototype[name];
	if (previous == null || !previous.$protected) this.prototype[name] = method;

	if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function(item){
		return method.apply(item, slice.call(arguments, 1));
	});
};

var extend = function(name, method){
	if (method && method.$hidden) return;
	var previous = this[name];
	if (previous == null || !previous.$protected) this[name] = method;
};

Type.implement({

	implement: implement.overloadSetter(),

	extend: extend.overloadSetter(),

	alias: function(name, existing){
		implement.call(this, name, this.prototype[existing]);
	}.overloadSetter(),

	mirror: function(hook){
		hooksOf(this).push(hook);
		return this;
	}

});

new Type('Type', Type);

// Default Types

var force = function(name, object, methods){
	var isType = (object != Object),
		prototype = object.prototype;

	if (isType) object = new Type(name, object);

	for (var i = 0, l = methods.length; i < l; i++){
		var key = methods[i],
			generic = object[key],
			proto = prototype[key];

		if (generic) generic.protect();

		if (isType && proto){
			delete prototype[key];
			prototype[key] = proto.protect();
		}
	}

	if (isType) object.implement(prototype);

	return force;
};

force('String', String, [
	'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
	'slice', 'split', 'substr', 'substring', 'toLowerCase', 'toUpperCase'
])('Array', Array, [
	'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
	'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
])('Number', Number, [
	'toExponential', 'toFixed', 'toLocaleString', 'toPrecision'
])('Function', Function, [
	'apply', 'call', 'bind'
])('RegExp', RegExp, [
	'exec', 'test'
])('Object', Object, [
	'create', 'defineProperty', 'defineProperties', 'keys',
	'getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
	'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'
])('Date', Date, ['now']);

Object.extend = extend.overloadSetter();

Date.extend('now', function(){
	return +(new Date);
});

new Type('Boolean', Boolean);

// fixes NaN returning as Number

Number.prototype.$family = function(){
	return isFinite(this) ? 'number' : 'null';
}.hide();

// Number.random

Number.extend('random', function(min, max){
	return Math.floor(Math.random() * (max - min + 1) + min);
});

// forEach, each

var hasOwnProperty = Object.prototype.hasOwnProperty;
Object.extend('forEach', function(object, fn, bind){
	for (var key in object){
		if (hasOwnProperty.call(object, key)) fn.call(bind, object[key], key, object);
	}
});

Object.each = Object.forEach;

Array.implement({

	forEach: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) fn.call(bind, this[i], i, this);
		}
	},

	each: function(fn, bind){
		Array.forEach(this, fn, bind);
		return this;
	}

});

// Array & Object cloning, Object merging and appending

var cloneOf = function(item){
	switch (typeOf(item)){
		case 'array': return item.clone();
		case 'object': return Object.clone(item);
		default: return item;
	}
};

Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

var mergeOne = function(source, key, current){
	switch (typeOf(current)){
		case 'object':
			if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
			else source[key] = Object.clone(current);
		break;
		case 'array': source[key] = current.clone(); break;
		default: source[key] = current;
	}
	return source;
};

Object.extend({

	merge: function(source, k, v){
		if (typeOf(k) == 'string') return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},

	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	},

	append: function(original){
		for (var i = 1, l = arguments.length; i < l; i++){
			var extended = arguments[i] || {};
			for (var key in extended) original[key] = extended[key];
		}
		return original;
	}

});

// Object-less types

['Object', 'WhiteSpace', 'TextNode', 'Collection', 'Arguments'].each(function(name){
	new Type(name);
});

// Unique ID

var UID = Date.now();

String.extend('uniqueID', function(){
	return (UID++).toString(36);
});

//<1.2compat>

var Hash = this.Hash = new Type('Hash', function(object){
	if (typeOf(object) == 'hash') object = Object.clone(object.getClean());
	for (var key in object) this[key] = object[key];
	return this;
});

Hash.implement({

	forEach: function(fn, bind){
		Object.forEach(this, fn, bind);
	},

	getClean: function(){
		var clean = {};
		for (var key in this){
			if (this.hasOwnProperty(key)) clean[key] = this[key];
		}
		return clean;
	},

	getLength: function(){
		var length = 0;
		for (var key in this){
			if (this.hasOwnProperty(key)) length++;
		}
		return length;
	}

});

Hash.alias('each', 'forEach');

Object.type = Type.isObject;

var Native = this.Native = function(properties){
	return new Type(properties.name, properties.initialize);
};

Native.type = Type.type;

Native.implement = function(objects, methods){
	for (var i = 0; i < objects.length; i++) objects[i].implement(methods);
	return Native;
};

var arrayType = Array.type;
Array.type = function(item){
	return instanceOf(item, Array) || arrayType(item);
};

this.$A = function(item){
	return Array.from(item).slice();
};

this.$arguments = function(i){
	return function(){
		return arguments[i];
	};
};

this.$chk = function(obj){
	return !!(obj || obj === 0);
};

this.$clear = function(timer){
	clearTimeout(timer);
	clearInterval(timer);
	return null;
};

this.$defined = function(obj){
	return (obj != null);
};

this.$each = function(iterable, fn, bind){
	var type = typeOf(iterable);
	((type == 'arguments' || type == 'collection' || type == 'array' || type == 'elements') ? Array : Object).each(iterable, fn, bind);
};

this.$empty = function(){};

this.$extend = function(original, extended){
	return Object.append(original, extended);
};

this.$H = function(object){
	return new Hash(object);
};

this.$merge = function(){
	var args = Array.slice(arguments);
	args.unshift({});
	return Object.merge.apply(null, args);
};

this.$lambda = Function.from;
this.$mixin = Object.merge;
this.$random = Number.random;
this.$splat = Array.from;
this.$time = Date.now;

this.$type = function(object){
	var type = typeOf(object);
	if (type == 'elements') return 'array';
	return (type == 'null') ? false : type;
};

this.$unlink = function(object){
	switch (typeOf(object)){
		case 'object': return Object.clone(object);
		case 'array': return Array.clone(object);
		case 'hash': return new Hash(object);
		default: return object;
	}
};

//</1.2compat>

})();

/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

extends: Core/Core

...
*/

(function(){

var arrayish = Array.prototype.indexOf;
var stringish = String.prototype.indexOf
var regexpish = RegExp.prototype.exec;
//Speedup 1: Avoid typeOf
var cloneOf = function(item){
  if (item && typeof(item) == 'object' && item.indexOf != stringish && item.exec != regexpish && !(item.nodeName && item.nodeType)) {
    if (item.indexOf == arrayish) return item.clone();
    else return Object.clone(item);
  }
  return item;
};
Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

//Speedup 2: Avoid typeOf
var mergeOne = function(source, key, current){
  if (current && typeof(current) == 'object' && current.indexOf != stringish && current.exec != regexpish && !(current.nodeName && current.nodeType) && (!current.$family || current.$family() == 'object')) {
    if (current.indexOf != arrayish) {
      var target = source[key];
			if (target && typeof(target) == 'object' && current.indexOf != stringish && target.exec != regexpish && target.indexOf != arrayish) Object.merge(source[key], current);
			else source[key] = Object.clone(current);
    } else source[key] = current.clone();
  } else source[key] = current;
	return source;
};


Object.extend({

  //Speedup 3: Avoid typeOf
	merge: function(source, k, v){
		if (typeof(k) == 'string' || (k && k.indexOf == stringish)) return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},

	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	}
});

})();

/*
---

name: Number

description: Contains Number Prototypes like limit, round, times, and ceil.

license: MIT-style license.

requires: Type

provides: Number

...
*/

Number.implement({

	limit: function(min, max){
		return Math.min(max, Math.max(min, this));
	},

	round: function(precision){
		precision = Math.pow(10, precision || 0).toFixed(precision < 0 ? -precision : 0);
		return Math.round(this * precision) / precision;
	},

	times: function(fn, bind){
		for (var i = 0; i < this; i++) fn.call(bind, i, this);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	}

});

Number.alias('each', 'times');

(function(math){
	var methods = {};
	math.each(function(name){
		if (!Number[name]) methods[name] = function(){
			return Math[name].apply(null, [this].concat(Array.from(arguments)));
		};
	});
	Number.implement(methods);
})(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan']);

/*
---

name: Function

description: Contains Function Prototypes like create, bind, pass, and delay.

license: MIT-style license.

requires: Type

provides: Function

...
*/

Function.extend({

	attempt: function(){
		for (var i = 0, l = arguments.length; i < l; i++){
			try {
				return arguments[i]();
			} catch (e){}
		}
		return null;
	}

});

Function.implement({

	attempt: function(args, bind){
		try {
			return this.apply(bind, Array.from(args));
		} catch (e){}
		
		return null;
	},

	/*<!ES5>*/
	bind: function(bind){
		var self = this,
			args = (arguments.length > 1) ? Array.slice(arguments, 1) : null;
		
		return function(){
			if (!args && !arguments.length) return self.call(bind);
			if (args && arguments.length) return self.apply(bind, args.concat(Array.from(arguments)));
			return self.apply(bind, args || arguments);
		};
	},
	/*</!ES5>*/

	pass: function(args, bind){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	delay: function(delay, bind, args){
		return setTimeout(this.pass((args == null ? [] : args), bind), delay);
	},

	periodical: function(periodical, bind, args){
		return setInterval(this.pass((args == null ? [] : args), bind), periodical);
	}

});

//<1.2compat>

delete Function.prototype.bind;

Function.implement({

	create: function(options){
		var self = this;
		options = options || {};
		return function(event){
			var args = options.arguments;
			args = (args != null) ? Array.from(args) : Array.slice(arguments, (options.event) ? 1 : 0);
			if (options.event) args = [event || window.event].extend(args);
			var returns = function(){
				return self.apply(options.bind || null, args);
			};
			if (options.delay) return setTimeout(returns, options.delay);
			if (options.periodical) return setInterval(returns, options.periodical);
			if (options.attempt) return Function.attempt(returns);
			return returns();
		};
	},

	bind: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	bindWithEvent: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(event){
			return self.apply(bind, (args == null) ? arguments : [event].concat(args));
		};
	},

	run: function(args, bind){
		return this.apply(bind, Array.from(args));
	}

});

var $try = Function.attempt;

//</1.2compat>

/*
---

name: String

description: Contains String Prototypes like camelCase, capitalize, test, and toInt.

license: MIT-style license.

requires: Type

provides: String

...
*/

String.implement({

	test: function(regex, params){
		return ((typeOf(regex) == 'regexp') ? regex : new RegExp('' + regex, params)).test(this);
	},

	contains: function(string, separator){
		return (separator) ? (separator + this + separator).indexOf(separator + string + separator) > -1 : this.indexOf(string) > -1;
	},

	trim: function(){
		return this.replace(/^\s+|\s+$/g, '');
	},

	clean: function(){
		return this.replace(/\s+/g, ' ').trim();
	},

	camelCase: function(){
		return this.replace(/-\D/g, function(match){
			return match.charAt(1).toUpperCase();
		});
	},

	hyphenate: function(){
		return this.replace(/[A-Z]/g, function(match){
			return ('-' + match.charAt(0).toLowerCase());
		});
	},

	capitalize: function(){
		return this.replace(/\b[a-z]/g, function(match){
			return match.toUpperCase();
		});
	},

	escapeRegExp: function(){
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	hexToRgb: function(array){
		var hex = this.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return (hex) ? hex.slice(1).hexToRgb(array) : null;
	},

	rgbToHex: function(array){
		var rgb = this.match(/\d{1,3}/g);
		return (rgb) ? rgb.rgbToHex(array) : null;
	},

	substitute: function(object, regexp){
		return this.replace(regexp || (/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != null) ? object[name] : '';
		});
	}

});

/*
---

script: String.Inflections.js

name: String Inflections

description: Several methods to convert strings back and forth between "railsish" names.  Helpful when creating JavaScript heavy rails (or similar MVC) apps.

license: MIT-style license.

authors:
  - Ryan Florence

thanks:
  - Rails Inflector (http://api.rubyonrails.org/classes/ActiveSupport/Inflector.html)
  - sporkyy (http://snippets.dzone.com/posts/show/3205)

requires: 
  - Core/String
  - Core/Number

provides: 
  - String.camelize
  - String.classify
  - String.dasherize
  - String.foreign_key
  - String.humanize
  - String.ordinalize
  - String.parameterize
  - String.pluralize
  - String.singularize
  - String.tableize
  - String.titleize
  - String.transliterate
  - String.underscore
  - String.capitalizeFirst
  - String.lowercaseFirst
  - Number.ordinalize

...
*/


;(function(){

var plurals = [
	[/(quiz)$/i,               '$1zes'  ],
	[/^(ox)$/i,                '$1en'   ],
	[/([m|l])ouse$/i,          '$1ice'  ],
	[/(matr|vert|ind)ix|ex$/i, '$1ices' ],
	[/(x|ch|ss|sh)$/i,         '$1es'   ],
	[/([^aeiouy]|qu)y$/i,      '$1ies'  ],
	[/(hive)$/i,               '$1s'    ],
	[/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
	[/sis$/i,                  'ses'    ],
	[/([ti])um$/i,             '$1a'    ],
	[/(buffal|tomat)o$/i,      '$1oes'  ],
	[/(bu)s$/i,                '$1ses'  ],
	[/(alias|status)$/i,       '$1es'   ],
	[/(octop|vir)us$/i,        '$1i'    ],
	[/(ax|test)is$/i,          '$1es'   ],
	[/s$/i,                    's'      ],
	[/$/,                      's'      ]
]
,singulars = [
	[/(database)s$/i,                                                  '$1'     ],
	[/(quiz)zes$/i,                                                    '$1'     ],
	[/(matr)ices$/i,                                                   '$1ix'   ],
	[/(vert|ind)ices$/i,                                               '$1ex'   ],
	[/^(ox)en/i,                                                       '$1'     ],
	[/(alias|status)es$/i,                                             '$1'     ],
	[/(octop|vir)i$/i,                                                 '$1us'   ],
	[/(cris|ax|test)es$/i,                                             '$1is'   ],
	[/(shoe)s$/i,                                                      '$1'     ],
	[/(o)es$/i,                                                        '$1'     ],
	[/(bus)es$/i,                                                      '$1'     ],
	[/([m|l])ice$/i,                                                   '$1ouse' ],
	[/(x|ch|ss|sh)es$/i,                                               '$1'     ],
	[/(m)ovies$/i,                                                     '$1ovie' ],
	[/(s)eries$/i,                                                     '$1eries'],
	[/([^aeiouy]|qu)ies$/i,                                            '$1y'    ],
	[/([lr])ves$/i,                                                    '$1f'    ],
	[/(tive)s$/i,                                                      '$1'     ],
	[/(hive)s$/i,                                                      '$1'     ],
	[/([^f])ves$/i,                                                    '$1fe'   ],
	[/(^analy)ses$/i,                                                  '$1sis'  ],
	[/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, '$1$2sis'],
	[/([ti])a$/i,                                                      '$1um'   ],
	[/(n)ews$/i,                                                       '$1ews'  ],
	[/s$/i,                                                            ''       ]
]
,irregulars = [
	['cow',    'kine'    ],
	['move',   'moves'   ],
	['sex',    'sexes'   ],
	['child',  'children'],
	['man',    'men'     ],
	['person', 'people'  ]
]
,uncountables = [
	'sheep',
	'fish',
	'series',
	'species',
	'money',
	'rice',
	'information',
	'equipment',
	'jeans'
];	
	
String.implement({
	
	camelize: function(lower){
		var str = this.replace(/_\D/g, function(match){
			return match.charAt(1).toUpperCase();
		});
		return (lower) ? str : str.capitalize();
	},
	
	classify: function(){
		return this.singularize().camelize();
	},
	
	dasherize: function(){
		return this.replace('_', '-').replace(/ +/, '-');
	},
	
	foreign_key: function(dontUnderScoreId){
		return this.underscore() + (dontUnderScoreId ? 'id' : '_id');
	},
	

	humanize: function(){
		return this.replace(/_id$/, '').replace(/_/gi,' ').capitalizeFirst();
	},
	
	ordinalize: function() {
		var parsed = parseInt(this);
		if (11 <= parsed % 100 && parsed % 100 <= 13) {
			return this + "th";
		} else {
			switch (parsed % 10) {
				case  1: return this + "st";
				case  2: return this + "nd";
				case  3: return this + "rd";
				default: return this + "th";
			}
		}
	},
	
	pluralize: function(count) {
		if (count && parseInt(count) == 1) return this;
		for (var i = 0; i < uncountables.length; i++) {
			var uncountable = uncountables[i];
			if (this.toLowerCase() == uncountable) {
				return uncountable;
			}
		}
		for (var i = 0; i < irregulars.length; i++) {
			var singular = irregulars[i][0];
			var plural   = irregulars[i][1];
			if ((this.toLowerCase() == singular) || (this == plural)) {
				return plural;
			}
		}
		for (var i = 0; i < plurals.length; i++) {
			var regex          = plurals[i][0];
			var replace_string = plurals[i][1];
			if (regex.test(this)) {
				return this.replace(regex, replace_string);
			}
		}
	},
	
	singularize: function() {
		for (var i = 0; i < uncountables.length; i++) {
			var uncountable = uncountables[i];
			if (this.toLowerCase() == uncountable) {
				return uncountable;
			}
		}
		for (var i = 0; i < irregulars.length; i++) {
			var singular = irregulars[i][0];
			var plural   = irregulars[i][1];
			if ((this.toLowerCase() == singular) || (this == plural)) {
				return singular;
			}
		}
		for (var i = 0; i < singulars.length; i++) {
			var regex          = singulars[i][0];
			var replace_string = singulars[i][1];
			if (regex.test(this)) {
				return this.replace(regex, replace_string);
			}
		}
	},
	
	tableize: function(){
		return this.underscore().pluralize();
	},
	
	titleize: function(){
		return this.underscore().humanize().capitalize();
	},
	
	underscore: function(){
		return this.lowercaseFirst().replace('-', '_').replace(/[A-Z]/g, function(match){
			return ('_' + match.charAt(0).toLowerCase());
		});
	},
	
	capitalizeFirst: function(){
		return this.charAt(0).toUpperCase() + this.slice(1);
	},
	
	lowercaseFirst: function(){
		return this.charAt(0).toLowerCase() + this.slice(1);
	}

});

Number.implement({
	ordinalize: function(){
		return this + ''.ordinalize();
	}
});

})();

/*
---

name: Array

description: Contains Array Prototypes like each, contains, and erase.

license: MIT-style license.

requires: Type

provides: Array

...
*/

Array.implement({

	/*<!ES5>*/
	every: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
		}
		return results;
	},

	indexOf: function(item, from){
		var len = this.length;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},
	/*</!ES5>*/

	clean: function(){
		return this.filter(function(item){
			return item != null;
		});
	},

	invoke: function(methodName){
		var args = Array.slice(arguments, 1);
		return this.map(function(item){
			return item[methodName].apply(item, args);
		});
	},

	associate: function(keys){
		var obj = {}, length = Math.min(this.length, keys.length);
		for (var i = 0; i < length; i++) obj[keys[i]] = this[i];
		return obj;
	},

	link: function(object){
		var result = {};
		for (var i = 0, l = this.length; i < l; i++){
			for (var key in object){
				if (object[key](this[i])){
					result[key] = this[i];
					delete object[key];
					break;
				}
			}
		}
		return result;
	},

	contains: function(item, from){
		return this.indexOf(item, from) != -1;
	},

	append: function(array){
		this.push.apply(this, array);
		return this;
	},

	getLast: function(){
		return (this.length) ? this[this.length - 1] : null;
	},

	getRandom: function(){
		return (this.length) ? this[Number.random(0, this.length - 1)] : null;
	},

	include: function(item){
		if (!this.contains(item)) this.push(item);
		return this;
	},

	combine: function(array){
		for (var i = 0, l = array.length; i < l; i++) this.include(array[i]);
		return this;
	},

	erase: function(item){
		for (var i = this.length; i--;){
			if (this[i] === item) this.splice(i, 1);
		}
		return this;
	},

	empty: function(){
		this.length = 0;
		return this;
	},

	flatten: function(){
		var array = [];
		for (var i = 0, l = this.length; i < l; i++){
			var type = typeOf(this[i]);
			if (type == 'null') continue;
			array = array.concat((type == 'array' || type == 'collection' || type == 'arguments' || instanceOf(this[i], Array)) ? Array.flatten(this[i]) : this[i]);
		}
		return array;
	},

	pick: function(){
		for (var i = 0, l = this.length; i < l; i++){
			if (this[i] != null) return this[i];
		}
		return null;
	},

	hexToRgb: function(array){
		if (this.length != 3) return null;
		var rgb = this.map(function(value){
			if (value.length == 1) value += value;
			return value.toInt(16);
		});
		return (array) ? rgb : 'rgb(' + rgb + ')';
	},

	rgbToHex: function(array){
		if (this.length < 3) return null;
		if (this.length == 4 && this[3] == 0 && !array) return 'transparent';
		var hex = [];
		for (var i = 0; i < 3; i++){
			var bit = (this[i] - 0).toString(16);
			hex.push((bit.length == 1) ? '0' + bit : bit);
		}
		return (array) ? hex : '#' + hex.join('');
	}

});

//<1.2compat>

Array.alias('extend', 'append');

var $pick = function(){
	return Array.from(arguments).pick();
};

//</1.2compat>

/*
---

name: Browser

description: The Browser Object. Contains Browser initialization, Window and Document, and the Browser Hash.

license: MIT-style license.

requires: [Array, Function, Number, String]

provides: [Browser, Window, Document]

...
*/

(function(){

var document = this.document;
var window = document.window = this;

var UID = 1;

this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [UID++]))[0];
} : function(item){
	return item.uid || (item.uid = UID++);
};

$uid(window);
$uid(document);

var ua = navigator.userAgent.toLowerCase(),
	platform = navigator.platform.toLowerCase(),
	UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0],
	mode = UA[1] == 'ie' && document.documentMode;

var Browser = this.Browser = {

	extend: Function.prototype.extend,

	name: (UA[1] == 'version') ? UA[3] : UA[1],

	version: mode || parseFloat((UA[1] == 'opera' && UA[4]) ? UA[4] : UA[2]),

	Platform: {
		name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
	},

	Features: {
		xpath: !!(document.evaluate),
		air: !!(window.runtime),
		query: !!(document.querySelector),
		json: !!(window.JSON)
	},

	Plugins: {}

};

Browser[Browser.name] = true;
Browser[Browser.name + parseInt(Browser.version, 10)] = true;
Browser.Platform[Browser.Platform.name] = true;

// Request

Browser.Request = (function(){

	var XMLHTTP = function(){
		return new XMLHttpRequest();
	};

	var MSXML2 = function(){
		return new ActiveXObject('MSXML2.XMLHTTP');
	};

	var MSXML = function(){
		return new ActiveXObject('Microsoft.XMLHTTP');
	};

	return Function.attempt(function(){
		XMLHTTP();
		return XMLHTTP;
	}, function(){
		MSXML2();
		return MSXML2;
	}, function(){
		MSXML();
		return MSXML;
	});

})();

Browser.Features.xhr = !!(Browser.Request);

// Flash detection

var version = (Function.attempt(function(){
	return navigator.plugins['Shockwave Flash'].description;
}, function(){
	return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
}) || '0 r0').match(/\d+/g);

Browser.Plugins.Flash = {
	version: Number(version[0] || '0.' + version[1]) || 0,
	build: Number(version[2]) || 0
};

// String scripts

Browser.exec = function(text){
	if (!text) return text;
	if (window.execScript){
		window.execScript(text);
	} else {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.text = text;
		document.head.appendChild(script);
		document.head.removeChild(script);
	}
	return text;
};

String.implement('stripScripts', function(exec){
	var scripts = '';
	var text = this.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, function(all, code){
		scripts += code + '\n';
		return '';
	});
	if (exec === true) Browser.exec(scripts);
	else if (typeOf(exec) == 'function') exec(scripts, text);
	return text;
});

// Window, Document

Browser.extend({
	Document: this.Document,
	Window: this.Window,
	Element: this.Element,
	Event: this.Event
});

this.Window = this.$constructor = new Type('Window', function(){});

this.$family = Function.from('window').hide();

Window.mirror(function(name, method){
	window[name] = method;
});

this.Document = document.$constructor = new Type('Document', function(){});

document.$family = Function.from('document').hide();

Document.mirror(function(name, method){
	document[name] = method;
});

document.html = document.documentElement;
if (!document.head) document.head = document.getElementsByTagName('head')[0];

if (document.execCommand) try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e){}

/*<ltIE9>*/
if (this.attachEvent && !this.addEventListener){
	var unloadEvent = function(){
		this.detachEvent('onunload', unloadEvent);
		document.head = document.html = document.window = null;
	};
	this.attachEvent('onunload', unloadEvent);
}

// IE fails on collections and <select>.options (refers to <select>)
var arrayFrom = Array.from;
try {
	arrayFrom(document.html.childNodes);
} catch(e){
	Array.from = function(item){
		if (typeof item != 'string' && Type.isEnumerable(item) && typeOf(item) != 'array'){
			var i = item.length, array = new Array(i);
			while (i--) array[i] = item[i];
			return array;
		}
		return arrayFrom(item);
	};

	var prototype = Array.prototype,
		slice = prototype.slice;
	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice'].each(function(name){
		var method = prototype[name];
		Array[name] = function(item){
			return method.apply(Array.from(item), slice.call(arguments, 1));
		};
	});
}
/*</ltIE9>*/

//<1.2compat>

if (Browser.Platform.ios) Browser.Platform.ipod = true;

Browser.Engine = {};

var setEngine = function(name, version){
	Browser.Engine.name = name;
	Browser.Engine[name + version] = true;
	Browser.Engine.version = version;
};

if (Browser.ie){
	Browser.Engine.trident = true;

	switch (Browser.version){
		case 6: setEngine('trident', 4); break;
		case 7: setEngine('trident', 5); break;
		case 8: setEngine('trident', 6);
	}
}

if (Browser.firefox){
	Browser.Engine.gecko = true;

	if (Browser.version >= 3) setEngine('gecko', 19);
	else setEngine('gecko', 18);
}

if (Browser.safari || Browser.chrome){
	Browser.Engine.webkit = true;

	switch (Browser.version){
		case 2: setEngine('webkit', 419); break;
		case 3: setEngine('webkit', 420); break;
		case 4: setEngine('webkit', 525);
	}
}

if (Browser.opera){
	Browser.Engine.presto = true;

	if (Browser.version >= 9.6) setEngine('presto', 960);
	else if (Browser.version >= 9.5) setEngine('presto', 950);
	else setEngine('presto', 925);
}

if (Browser.name == 'unknown'){
	switch ((ua.match(/(?:webkit|khtml|gecko)/) || [])[0]){
		case 'webkit':
		case 'khtml':
			Browser.Engine.webkit = true;
		break;
		case 'gecko':
			Browser.Engine.gecko = true;
	}
}

this.$exec = Browser.exec;

//</1.2compat>

})();

/*
---

name: Browser.Features.Touch

description: Checks whether the used Browser has touch events

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/Browser]

provides: Browser.Features.Touch

...
*/

if(!Browser.ie){
  Browser.Features.Touch = (function(){
  	try {
  		document.createEvent('TouchEvent').initTouchEvent('touchstart');
  		return true;
  	} catch (exception){}

  	return false;
  })();

  // Chrome 5 thinks it is touchy!
  // Android doesn't have a touch delay and dispatchEvent does not fire the handler
  Browser.Features.iOSTouch = (function(){
  	var name = 'cantouch', // Name does not matter
  		html = document.html,
  		hasTouch = false;

  	var handler = function(){
  		html.removeEventListener(name, handler, true);
  		hasTouch = true;
  	};

  	try {
  		html.addEventListener(name, handler, true);
  		var event = document.createEvent('TouchEvent');
  		event.initTouchEvent(name);
  		html.dispatchEvent(event);
  		return hasTouch;
  	} catch (exception){}

  	handler(); // Remove listener
  	return false;
  })();
};
/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

requires: [Array, String, Function, Number]

provides: Class

...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	if (instanceOf(params, Function)) params = {initialize: params};

	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this).implement(params);

	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;
});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name,
		parent = this.$caller.$owner.parent,
		previous = (parent) ? parent.prototype[name] : null;
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};

var reset = function(object){
	for (var key in object){
		var value = object[key];
		switch (typeOf(value)){
			case 'object':
				var F = function(){};
				F.prototype = value;
				object[key] = reset(new F);
			break;
			case 'array': object[key] = value.clone(); break;
		}
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

var implement = function(key, value, retain){
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}

	if (typeOf(value) == 'function'){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}

	return this;
};

var getInstance = function(klass){
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},

	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();

/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

extends: Core/Class


...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	if (instanceOf(params, Function)) params = {initialize: params};

	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this).implement(params);

	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;
});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name,
		parent = this.$caller.$owner.parent,
		previous = (parent) ? parent.prototype[name] : null;
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};


var indexOf = Array.prototype.indexOf;
var exec = RegExp.prototype.exec;
//Speedup1: Avoid typeOf in reset

// before: 
// switch (typeOf(value)){
//	case 'object':
//	case 'array':

// after:
var reset = function(object){
	for (var key in object){
		var value = object[key];
    if (value && typeof(value) == 'object' && value.exec != exec) {
      if (value.indexOf != indexOf) {
				var F = function(){};
				F.prototype = value;
				object[key] = reset(new F);
      } else object[key] = value.clone();
    }
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

//Speedup 2: Avoid typeOf in implement
var apply = Function.prototype.apply
var implement = function(key, value, retain){
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}

	if (value && value.call && (value.apply == apply)){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}

	return this;
};

var getInstance = function(klass){
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},

	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();

/*
---
 
script: FastArray.js
 
description: Array with fast lookup (based on object)
 
license: MIT-style license.
 
requires:
- Core/Class
 
provides: [FastArray]
 
...
*/

window.FastArray = function() {
  this.push.apply(this, arguments);
}

FastArray.from = function(ary) {
  var array = new FastArray;
  FastArray.prototype.push.apply(array, ary)
  return array;
}
Array.fast = function() {
  var object = {};
  for (var i = 0, arg; arg = arguments[i++];) object[arg] = true;
  return object;
};
FastArray.prototype = {
  push: function() {
    Array.each(arguments, function(argument) {
      this[argument] = true;
    }, this);
  },

  contains: function(argument) {
    return this[argument];
  },
  
  concat: function(array) {
    if ('length' in array) this.push.apply(this, array);
    else for (var key in array) if (array.hasOwnProperty(key)) this[key] = true;
    return this;
  },
  
  each: function(callback, bound) {
    for (var key in this) {
      if (this.hasOwnProperty(key)) callback.call(bound || this, key, this[key]);
    }
  },

  include: function(value) {
    this[value] = true;
  },

  erase: function(value) {
    delete this[value];
  },
  
  join: function(delimeter) {
    var bits = [];
    for (var key in this) if (this.hasOwnProperty(key)) bits.push(key);
    return bits.join(delimeter)
  }
};
/*
---
 
script: Class.Mixin.js
 
description: Classes that can be mixed in and out in runtime.
 
license: MIT-style license.
 
requires:
  - Core/Class

provides: 
  - Class.Mutators.Mixins
  - Class.mixin
  - Class.unmix
 
...
*/

Class.mixin = function(instance, klass, light) {
  var proto = klass.prototype;
  Object.each(proto, function(value, name) {
    if (typeof value !== 'function') return;
    switch (name) {
      case "parent": case "initialize": case "uninitialize": case "$constructor":
        return;
    }
    value = value.$origin;
    var origin = instance[name], parent, wrap
    if (origin) {
      if (origin.$mixes) return origin.$mixes.push(value);
      parent = origin.$owner;
      wrap = origin;
      origin = origin.$origin;
    };
    if (instance[name] && light) return;
    var wrapper = instance[name] = function() {
      var stack = wrapper.$stack;
      if (!stack) stack = wrapper.$stack = wrapper.$mixes.clone()
      var mix = stack.pop();
      wrapper.$owner = {parent: mix ? instance.$constructor : parent}
      if (!mix) mix = origin;
      if (!mix) return;
      var caller = this.caller, current = this.$caller;
      this.caller = current; this.$caller = wrapper;
      var result = (mix || origin).apply(this, arguments);
      this.$caller = current; this.caller = caller;
      delete wrapper.$stack;
      return result;
    }
    wrapper.$mixes = [value];
    wrapper.$origin = origin;
    wrapper.$name = name;
  });
  if (proto.initialize) {
    var parent = instance.parent; instance.parent = function(){};
    proto.initialize.call(instance, instance);
    instance.parent = parent;
  }
};

Class.unmix = function(instance, klass, light) {
  var proto = klass.prototype;
  Object.each(proto, function(value, key) {
    if (typeof value !== 'function') return;
    var remixed = instance[key]
    if (remixed && remixed.$mixes) {
      if (light) return;
      remixed.$mixes.erase(value.$origin);
      if (!remixed.$mixes.length) {
        if (remixed.$origin) instance[key] = remixed.$origin;
        else delete instance[key];
      }
    }
  })
  if (proto.uninitialize) {
    var parent = instance.parent; instance.parent = function(){};
    proto.uninitialize.call(instance, instance);
    instance.parent = parent;
  }
};

Class.implement('mixin', function(klass) {
  Class.mixin(this, klass)
});

Class.implement('unmix', function(klass) {
  Class.unmix(this, klass)
});
/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

provides: [Class.Extras, Chain, Events, Options]

...
*/

(function(){

this.Chain = new Class({

	$chain: [],

	chain: function(){
		this.$chain.append(Array.flatten(arguments));
		return this;
	},

	callChain: function(){
		return (this.$chain.length) ? this.$chain.shift().apply(this, arguments) : false;
	},

	clearChain: function(){
		this.$chain.empty();
		return this;
	}

});

var removeOn = function(string){
	return string.replace(/^on([A-Z])/, function(full, first){
		return first.toLowerCase();
	});
};

this.Events = new Class({

	$events: {},

	addEvent: function(type, fn, internal){
		type = removeOn(type);

		/*<1.2compat>*/
		if (fn == $empty) return this;
		/*</1.2compat>*/

		this.$events[type] = (this.$events[type] || []).include(fn);
		if (internal) fn.internal = true;
		return this;
	},

	addEvents: function(events){
		for (var type in events) this.addEvent(type, events[type]);
		return this;
	},

	fireEvent: function(type, args, delay){
		type = removeOn(type);
		var events = this.$events[type];
		if (!events) return this;
		args = Array.from(args);
		events.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},
	
	removeEvent: function(type, fn){
		type = removeOn(type);
		var events = this.$events[type];
		if (events && !fn.internal){
			var index =  events.indexOf(fn);
			if (index != -1) delete events[index];
		}
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		if (events) events = removeOn(events);
		for (type in this.$events){
			if (events && events != type) continue;
			var fns = this.$events[type];
			for (var i = fns.length; i--;) if (i in fns){
				this.removeEvent(type, fns[i]);
			}
		}
		return this;
	}

});

this.Options = new Class({

	setOptions: function(){
		var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
		if (this.addEvent) for (var option in options){
			if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
			this.addEvent(option, options[option]);
			delete options[option];
		}
		return this;
	}

});

})();

/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

extends: Core/Class.Extras
...
*/

//dont use typeOf in loop :)

(function(apply) {
  
  Options.prototype.setOptions = function(){
  	var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
  	if (this.addEvent) for (var option in options){
  	  var value = options[option];
  		if (!value || (value.apply != apply) || !(/^on[A-Z]/).test(option)) continue;
  		this.addEvent(option, options[option]);
  		delete options[option];
  	}
  	return this;
  }

})(Function.prototype.apply);
/*
---
 
script: Class.Shortcuts.js
 
description: A mixin that adds and fiews keyboard shortcuts as events on object.
 
license: MIT-style license.
 
requires:
  - Core/Options
  - Core/Events
  - Core/Class
  - Core/Class.Extras
  - Core/Browser

provides: 
  - Shortcuts
 
...
*/


!function() {
  var parsed = {};
  var modifiers = ['shift', 'control', 'alt', 'meta'];
  var aliases = {
    'ctrl': 'control',
    'command': Browser.Platform.mac ? 'meta': 'control',
    'cmd': Browser.Platform.mac ? 'meta': 'control'
  };
  var presets = {
    'next': ['right', 'down'],
    'previous': ['left', 'up'],
    'ok': ['enter', 'space'],
    'cancel': ['esc']
  };

  var parse = function(expression){
    if (presets[expression]) expression = presets[expression];
    return (expression.push ? expression : [expression]).map(function(type) {
      if (!parsed[type]){
        var bits = [], mods = {}, string, event;
        if (type.contains(':')) {
          string = type.split(':');
          event = string[0];
          string = string[1];
        } else {  
          string = type;
          event = 'keypress';
        }
        string.split('+').each(function(part){
          if (aliases[part]) part = aliases[part];
          if (modifiers.contains(part)) mods[part] = true;
          else bits.push(part);
        });

        modifiers.each(function(mod){
          if (mods[mod]) bits.unshift(mod);
        });

        parsed[type] = event + ':' + bits.join('+');
      }
      return parsed[type];
    });
  };
  
  Shortcuts = new Class({
    
    addShortcut: function(shortcut, fn) {
      var shortcuts = this.shortcuts;
      if (!shortcuts) this.shortcuts = shortcuts = {}
      var group = shortcuts[shortcut];
      if (!group) shortcuts[shortcut] = group = []
      group.push(fn);
      if (this.shortcutting) 
        for (var i = 0, parsed = parse(shortcut), event; event = parsed[i++];)
          this.addEvent(event, fn)
    },
    
    removeShortcut: function(shortcut, fn) {
      var shortcuts = this.shortcuts;
      if (!shortcuts) return;
      var group = shortcuts[shortcut];
      if (!group) return;
      group.push(fn);
      if (this.shortcutting) 
        for (var i = 0, parsed = parse(shortcut), event; event = parsed[i++];)
          this.removeEvent(event, fn)
    },
    
    getKeyListener: function() {
      return this.element;
    },

    enableShortcuts: function() {
      if (!this.shortcutter) {
        this.shortcutter = function(event) {
          var bits = [event.key];
          modifiers.each(function(mod){
            if (event[mod]) bits.unshift(mod);
          });
          this.fireEvent(event.type + ':' + bits.join('+'), arguments)
        }.bind(this)
      }
      if (this.shortcutting) return;
      this.shortcutting = true;
      this.getKeyListener().addEvent('keypress', this.shortcutter);
      for (var name in this.shortcuts)
        for (var i = 0, parsed = parse(name), group = this.shortcuts[name], event; event = parsed[i++];)
          for (var j = 0, fn; fn = group[j++];) this.addEvent(event, fn);
    },

    disableShortcuts: function() {
      if (!this.shortcutting) return;
      this.shortcutting = false;
      this.getKeyListener().removeEvent('keypress', this.shortcutter);
      for (var name in this.shortcuts)
        for (var i = 0, parsed = parse(name), group = this.shortcuts[name], event; event = parsed[i++];)
          for (var j = 0, fn; fn = group[j++];) this.removeEvent(event, fn);
    }
  });
  
}();

/*
---
 
script: Class.Includes.js
 
description: Multiple inheritance in mootools, chained Extend basically.
 
license: MIT-style license.
 
requires:
- Core/Options
- Core/Events
- Core/Class

provides: [Class.Mutators.Includes, Class.include, Class.flatten]
 
...
*/

(function() {
  
  var getInstance = function(klass){
    klass.$prototyping = true;
    var proto = new klass;
    delete klass.$prototyping;
    return proto;
  };
  
  Class.include = function(klass, klasses) {
    return new Class({
      Includes: Array.from(arguments).flatten()
    });
  };
  
  Class.flatten = function(items) {
    return Array.from(items).clean().map(function(item, i) {
      if (item.parent) {
        return [Class.flatten(item.parent), item];
      } else {
        return item;
      }
    }).flatten();
  };

  Class.Mutators.Includes = function(items) {
    items = Array.from(items);
    var instance = this.parent ? this.parent : items.shift();
    Class.flatten(items).each(function(parent){
      var baked = new Class, proto = parent.prototype;
      if (instance) {
        baked.parent = instance;
        baked.prototype = getInstance(instance);
      }
      for (var name in proto) {
        switch (name) {
          case "$caller": case "$constructor": case "parent": case "caller":
            continue;
        }
        var fn = proto[name];
        if (fn && fn.$owner && (fn.$owner != parent) && fn.$owner.parent) continue;
        baked.implement(name, fn);
      }
      instance = baked;
    }, this);
    this.parent = instance;
    this.prototype = getInstance(instance);
  };
})();
/*
---
 
script: Class.States.js
 
description: A mutator that adds some basic state definition capabilities.
 
license: MIT-style license.
 
requires:
  - Core/Options
  - Core/Events
  - Core/Class
  - Core/Class.Extras

provides: 
  - States
 
...
*/


var States = new Class({
  addStates: function(states) {
    for (var i = 0, j = arguments.length, arg; i < j; i++) {
      arg = arguments[i];
      if (arg.indexOf) this.addState(arg);
      else for (var name in arg) this.addState(name, arg[name]);
    }
  },
  
  removeStates: function(states) {
    for (var i = 0, j = arguments.length, arg; i < j; i++) {
      arg = arguments[i];
      if (arg.indexOf) this.removeState(arg);
      else for (var name in arg) this.removeState(name, arg[name]);
    }
  },
  
  addState: function(name, state) {
    if (!state || state === true) state = States.get(name);
    if (!this.$states) this.$states = {};
    if (this.$states[name]) return;
    this.$states[name] = state;
    var enabler = this[state.enabler], disabler = this[state.disabler], toggler = this[state.toggler];
    this[state.enabler] = function() {
      return this.setStateTo(name, true, state, arguments, enabler)
    }
    this[state.disabler] = function() {
      return this.setStateTo(name, false, state, arguments, disabler)
    }
    this[state.toggler] = function() { 
      return this.setStateTo(name, !this[state.property || name], state, arguments, toggler)
    }
    if (state.initial || this[state.property || name]) this[state.enabler]();
  },

  removeState: function(name, state) {
    if (!state) state = States.get(state);
    delete this.$states[name];
  },
  
  linkState: function(object, from, to, state) {
    var first = this.$states[from] || States.get(from);
    var second = object.$states[to] || States.get(to);
    var events = (first.events || first), method = (state === false ? 'removeEvent' : 'addEvent');
    var enabler = second.enabler, disabler = second.disabler;
    if (enabler.indexOf) enabler = (object.bindEvent ? object.bindEvent(enabler) : object[enabler].bind(object));
    if (disabler.indexOf) disabler = (object.bindEvent ? object.bindEvent(disabler) : object[disabler].bind(object));
    this[method](events.enabler, enabler);
    this[method](events.disabler, disabler);
    if (this[first.property || from]) object[second.enabler]();
  },
  
  unlinkState: function(object, from, to) {
    return this.linkState(object, from, to, false)
  },
  
  setStateTo: function(name, value, state, args, callback) {
    if (!state || state === true) state = States.get(name);
    if (this[state.property || name] == value) return false;
    this[state.property || name] = !!value;
    if (callback) {
      var result = callback.apply(this, args);
      if (result === false) return false;
    }
    this.fireEvent((state.events || state)[value ? 'enabler' : 'disabler'], result || args);
    if (this.onStateChange && (state.reflect !== false)) this.onStateChange(name, value, result || args);
    return true;
  }
});

States.get = function() {
  return;
};
/*
---
 
script: Class.Macros.js
 
description: A few functions that simplify definition of everyday methods with common logic
 
license: MIT-style license.
 
requires:
- Core/Options
- Core/Events
- Core/Class.Extras

provides: [Macro, Class.hasParent]
 
...
*/

Class.hasParent = function(klass) {
  var caller = klass.$caller;
  return !!(caller.$owner.parent && caller.$owner.parent.prototype[caller.$name]);
};

Macro = {};

/*
Make stackable function what executes it's parent before itself
*/
Macro.onion = function(callback) {
  return function() {
    if (!this.parent.apply(this, arguments)) return;
    return callback.apply(this, arguments) !== false;
  };
};

/*
Make getter-function with cache. Returned function alculates values on first call, after return this[name].
To reset cache use:

  delete this[name];

*/
Macro.getter = function(name, callback) {
  return function() {
    if (!this[name]) this[name] = callback.apply(this, arguments);
    return this[name];
  };
};


/*
Make function that runs it's parent if it exists, and runs itself if does not
*/
Macro.defaults = function(callback) {
  return function() {
    if (Class.hasParent(this)) {
      return this.parent.apply(this, arguments);
    } else {
      return callback.apply(this, arguments);
    }
  };
};

/*
Make function what returns property 'name' of passed argument
*/
Macro.map = function(name) {
  return function(item) {
    return item[name];
  };
};

/*
Make function Macro.map but diference that Macro.proc calls 'name' method
*/
Macro.proc = function(name, args) {
  return function(item) {
    return item[name].apply(item, args || arguments);
  };
};

/*
Make function what call method 'method' of property this[name] with passed arguments
*/
Macro.delegate = function(name, method) {
  return function() {
    if (this[name]) return this[name][method].apply(this[name], arguments);
  };
};
/*
---

name: Fx

description: Contains the basic animation logic to be extended by all other Fx Classes.

license: MIT-style license.

requires: [Chain, Events, Options]

provides: Fx

...
*/

(function(){

var Fx = this.Fx = new Class({

	Implements: [Chain, Events, Options],

	options: {
		/*
		onStart: nil,
		onCancel: nil,
		onComplete: nil,
		*/
		fps: 60,
		unit: false,
		duration: 500,
		frames: null,
		frameSkip: true,
		link: 'ignore'
	},

	initialize: function(options){
		this.subject = this.subject || this;
		this.setOptions(options);
	},

	getTransition: function(){
		return function(p){
			return -(Math.cos(Math.PI * p) - 1) / 2;
		};
	},

	step: function(now){
		if (this.options.frameSkip){
			var diff = (this.time != null) ? (now - this.time) : 0, frames = diff / this.frameInterval;
			this.time = now;
			this.frame += frames;
		} else {
			this.frame++;
		}
		
		if (this.frame < this.frames){
			var delta = this.transition(this.frame / this.frames);
			this.set(this.compute(this.from, this.to, delta));
		} else {
			this.frame = this.frames;
			this.set(this.compute(this.from, this.to, 1));
			this.stop();
		}
	},

	set: function(now){
		return now;
	},

	compute: function(from, to, delta){
		return Fx.compute(from, to, delta);
	},

	check: function(){
		if (!this.isRunning()) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.pass(arguments, this)); return false;
		}
		return false;
	},

	start: function(from, to){
		if (!this.check(from, to)) return this;
		this.from = from;
		this.to = to;
		this.frame = (this.options.frameSkip) ? 0 : -1;
		this.time = null;
		this.transition = this.getTransition();
		var frames = this.options.frames, fps = this.options.fps, duration = this.options.duration;
		this.duration = Fx.Durations[duration] || duration.toInt();
		this.frameInterval = 1000 / fps;
		this.frames = frames || Math.round(this.duration / this.frameInterval);
		this.fireEvent('start', this.subject);
		pushInstance.call(this, fps);
		return this;
	},
	
	stop: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
			if (this.frames == this.frame){
				this.fireEvent('complete', this.subject);
				if (!this.callChain()) this.fireEvent('chainComplete', this.subject);
			} else {
				this.fireEvent('stop', this.subject);
			}
		}
		return this;
	},
	
	cancel: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
			this.frame = this.frames;
			this.fireEvent('cancel', this.subject).clearChain();
		}
		return this;
	},
	
	pause: function(){
		if (this.isRunning()){
			this.time = null;
			pullInstance.call(this, this.options.fps);
		}
		return this;
	},
	
	resume: function(){
		if ((this.frame < this.frames) && !this.isRunning()) pushInstance.call(this, this.options.fps);
		return this;
	},
	
	isRunning: function(){
		var list = instances[this.options.fps];
		return list && list.contains(this);
	}

});

Fx.compute = function(from, to, delta){
	return (to - from) * delta + from;
};

Fx.Durations = {'short': 250, 'normal': 500, 'long': 1000};

// global timers

var instances = {}, timers = {};

var loop = function(){
	var now = Date.now();
	for (var i = this.length; i--;){
		var instance = this[i];
		if (instance) instance.step(now);
	}
};

var pushInstance = function(fps){
	var list = instances[fps] || (instances[fps] = []);
	list.push(this);
	if (!timers[fps]) timers[fps] = loop.periodical(Math.round(1000 / fps), list);
};

var pullInstance = function(fps){
	var list = instances[fps];
	if (list){
		list.erase(this);
		if (!list.length && timers[fps]){
			delete instances[fps];
			timers[fps] = clearInterval(timers[fps]);
		}
	}
};

})();

/*
---

name: Fx.Transitions

description: Contains a set of advanced transitions to be used with any of the Fx Classes.

license: MIT-style license.

credits:
  - Easing Equations by Robert Penner, <http://www.robertpenner.com/easing/>, modified and optimized to be used with MooTools.

requires: Fx

provides: Fx.Transitions

...
*/

Fx.implement({

	getTransition: function(){
		var trans = this.options.transition || Fx.Transitions.Sine.easeInOut;
		if (typeof trans == 'string'){
			var data = trans.split(':');
			trans = Fx.Transitions;
			trans = trans[data[0]] || trans[data[0].capitalize()];
			if (data[1]) trans = trans['ease' + data[1].capitalize() + (data[2] ? data[2].capitalize() : '')];
		}
		return trans;
	}

});

Fx.Transition = function(transition, params){
	params = Array.from(params);
	var easeIn = function(pos){
		return transition(pos, params);
	};
	return Object.append(easeIn, {
		easeIn: easeIn,
		easeOut: function(pos){
			return 1 - transition(1 - pos, params);
		},
		easeInOut: function(pos){
			return (pos <= 0.5 ? transition(2 * pos, params) : (2 - transition(2 * (1 - pos), params))) / 2;
		}
	});
};

Fx.Transitions = {

	linear: function(zero){
		return zero;
	}

};

//<1.2compat>

Fx.Transitions = new Hash(Fx.Transitions);

//</1.2compat>

Fx.Transitions.extend = function(transitions){
	for (var transition in transitions) Fx.Transitions[transition] = new Fx.Transition(transitions[transition]);
};

Fx.Transitions.extend({

	Pow: function(p, x){
		return Math.pow(p, x && x[0] || 6);
	},

	Expo: function(p){
		return Math.pow(2, 8 * (p - 1));
	},

	Circ: function(p){
		return 1 - Math.sin(Math.acos(p));
	},

	Sine: function(p){
		return 1 - Math.cos(p * Math.PI / 2);
	},

	Back: function(p, x){
		x = x && x[0] || 1.618;
		return Math.pow(p, 2) * ((x + 1) * p - x);
	},

	Bounce: function(p){
		var value;
		for (var a = 0, b = 1; 1; a += b, b /= 2){
			if (p >= (7 - 4 * a) / 11){
				value = b * b - Math.pow((11 - 6 * a - 11 * p) / 4, 2);
				break;
			}
		}
		return value;
	},

	Elastic: function(p, x){
		return Math.pow(2, 10 * --p) * Math.cos(20 * p * Math.PI * (x && x[0] || 1) / 3);
	}

});

['Quad', 'Cubic', 'Quart', 'Quint'].each(function(transition, i){
	Fx.Transitions[transition] = new Fx.Transition(function(p){
		return Math.pow(p, i + 2);
	});
});

/*
---

name: JSON

description: JSON encoder and decoder.

license: MIT-style license.

See Also: <http://www.json.org/>

requires: [Array, String, Number, Function]

provides: JSON

...
*/

if (typeof JSON == 'undefined') this.JSON = {};

//<1.2compat>

JSON = new Hash({
	stringify: JSON.stringify,
	parse: JSON.parse
});

//</1.2compat>

(function(){

var special = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'};

var escape = function(chr){
	return special[chr] || '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4);
};

JSON.validate = function(string){
	string = string.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
					replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
					replace(/(?:^|:|,)(?:\s*\[)+/g, '');

	return (/^[\],:{}\s]*$/).test(string);
};

JSON.encode = JSON.stringify ? function(obj){
	return JSON.stringify(obj);
} : function(obj){
	if (obj && obj.toJSON) obj = obj.toJSON();

	switch (typeOf(obj)){
		case 'string':
			return '"' + obj.replace(/[\x00-\x1f\\"]/g, escape) + '"';
		case 'array':
			return '[' + obj.map(JSON.encode).clean() + ']';
		case 'object': case 'hash':
			var string = [];
			Object.each(obj, function(value, key){
				var json = JSON.encode(value);
				if (json) string.push(JSON.encode(key) + ':' + json);
			});
			return '{' + string + '}';
		case 'number': case 'boolean': return '' + obj;
		case 'null': return 'null';
	}

	return null;
};

JSON.decode = function(string, secure){
	if (!string || typeOf(string) != 'string') return null;

	if (secure || JSON.secure){
		if (JSON.parse) return JSON.parse(string);
		if (!JSON.validate(string)) throw new Error('JSON could not decode the input; security is enabled and the value is not secure.');
	}

	return eval('(' + string + ')');
};

})();

/*
---
name: Color
description: Class to create and manipulate colors. Includes HSB «-» RGB «-» HEX conversions. Supports alpha for each type.
requires: [Core/Type, Core/Array]
provides: Color
...
*/

(function(){

var colors = {
	maroon: '#800000', red: '#ff0000', orange: '#ffA500', yellow: '#ffff00', olive: '#808000',
	purple: '#800080', fuchsia: "#ff00ff", white: '#ffffff', lime: '#00ff00', green: '#008000',
	navy: '#000080', blue: '#0000ff', aqua: '#00ffff', teal: '#008080',
	black: '#000000', silver: '#c0c0c0', gray: '#808080'
};

var Color = this.Color = function(color, type){
	
	if (color.isColor){
		
		this.red = color.red;
		this.green = color.green;
		this.blue = color.blue;
		this.alpha = color.alpha;

	} else {
		
		var namedColor = colors[color];
		if (namedColor){
			color = namedColor;
			type = 'hex';
		}

		switch (typeof color){
			case 'string': if (!type) type = (type = color.match(/^rgb|^hsb/)) ? type[0] : 'hex'; break;
			case 'object': type = type || 'rgb'; color = color.toString(); break;
			case 'number': type = 'hex'; color = color.toString(16); break;
		}

		color = Color['parse' + type.toUpperCase()](color);
		this.red = color[0];
		this.green = color[1];
		this.blue = color[2];
		this.alpha = color[3];
	}
	
	this.isColor = true;

};

var limit = function(number, min, max){
	return Math.min(max, Math.max(min, number));
};

var listMatch = /([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,?\s*([-.\d]*)/;
var hexMatch = /^#?([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{0,2})$/i;

Color.parseRGB = function(color){
	return color.match(listMatch).slice(1).map(function(bit, i){
		return (i < 3) ? Math.round(((bit %= 256) < 0) ? bit + 256 : bit) : limit(((bit === '') ? 1 : Number(bit)), 0, 1);
	});
};
	
Color.parseHEX = function(color){
	if (color.length == 1) color = color + color + color;
	return color.match(hexMatch).slice(1).map(function(bit, i){
		if (i == 3) return (bit) ? parseInt(bit, 16) / 255 : 1;
		return parseInt((bit.length == 1) ? bit + bit : bit, 16);
	});
};
	
Color.parseHSB = function(color){
	var hsb = color.match(listMatch).slice(1).map(function(bit, i){
		if (i === 0) return Math.round(((bit %= 360) < 0) ? (bit + 360) : bit);
		else if (i < 3) return limit(Math.round(bit), 0, 100);
		else return limit(((bit === '') ? 1 : Number(bit)), 0, 1);
	});
	
	var a = hsb[3];
	var br = Math.round(hsb[2] / 100 * 255);
	if (hsb[1] == 0) return [br, br, br, a];
		
	var hue = hsb[0];
	var f = hue % 60;
	var p = Math.round((hsb[2] * (100 - hsb[1])) / 10000 * 255);
	var q = Math.round((hsb[2] * (6000 - hsb[1] * f)) / 600000 * 255);
	var t = Math.round((hsb[2] * (6000 - hsb[1] * (60 - f))) / 600000 * 255);

	switch (Math.floor(hue / 60)){
		case 0: return [br, t, p, a];
		case 1: return [q, br, p, a];
		case 2: return [p, br, t, a];
		case 3: return [p, q, br, a];
		case 4: return [t, p, br, a];
		default: return [br, p, q, a];
	}
};

var toString = function(type, array){
	if (array[3] != 1) type += 'a';
	else array.pop();
	return type + '(' + array.join(', ') + ')';
};

Color.prototype = {

	toHSB: function(array){
		var red = this.red, green = this.green, blue = this.blue, alpha = this.alpha;

		var max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min;
		var hue = 0, saturation = (max != 0) ? delta / max : 0, brightness = max / 255;
		if (saturation){
			var rr = (max - red) / delta, gr = (max - green) / delta, br = (max - blue) / delta;
			hue = (red == max) ? br - gr : (green == max) ? 2 + rr - br : 4 + gr - rr;
			if ((hue /= 6) < 0) hue++;
		}

		var hsb = [Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100), alpha];

		return (array) ? hsb : toString('hsb', hsb);
	},

	toHEX: function(array){

		var a = this.alpha;
		var alpha = ((a = Math.round((a * 255)).toString(16)).length == 1) ? a + a : a;
		
		var hex = [this.red, this.green, this.blue].map(function(bit){
			bit = bit.toString(16);
			return (bit.length == 1) ? '0' + bit : bit;
		});
		
		return (array) ? hex.concat(alpha) : '#' + hex.join('') + ((alpha == 'ff') ? '' : alpha);
	},
	
	toRGB: function(array){
		var rgb = [this.red, this.green, this.blue, this.alpha];
		return (array) ? rgb : toString('rgb', rgb);
	}

};

Color.prototype.toString = Color.prototype.toRGB;

Color.hex = function(hex){
	return new Color(hex, 'hex');
};

if (this.hex == null) this.hex = Color.hex;

Color.hsb = function(h, s, b, a){
	return new Color([h || 0, s || 0, b || 0, (a == null) ? 1 : a], 'hsb');
};

if (this.hsb == null) this.hsb = Color.hsb;

Color.rgb = function(r, g, b, a){
	return new Color([r || 0, g || 0, b || 0, (a == null) ? 1 : a], 'rgb');
};

if (this.rgb == null) this.rgb = Color.rgb;

if (this.Type) new Type('Color', Color);

})();

/*
---
name: ART
description: "The heart of ART."
requires: [Core/Class, Color/Color, Table/Table]
provides: [ART, ART.Element, ART.Container]
...
*/

(function(){

this.ART = new Class;

ART.version = '09.dev';
ART.build = 'DEV';

ART.Element = new Class({
	
	/* dom */

	inject: function(element){
		if (element.element) element = element.element;
		element.appendChild(this.element);
		return this;
	},
	
	eject: function(){
		var element = this.element, parent = element.parentNode;
		if (parent) parent.removeChild(element);
		return this;
	},
	
	/* events */
	
	listen: function(type, fn){
		if (!this._events) this._events = {};
		
		if (typeof type != 'string'){ // listen type / fn with object
			for (var t in type) this.listen(t, type[t]);
		} else { // listen to one
			if (!this._events[type]) this._events[type] = new Table;
			var events = this._events[type];
			if (events.get(fn)) return this;
			var bound = fn.bind(this);
			events.set(fn, bound);
			var element = this.element;
			if (element.addEventListener) element.addEventListener(type, bound, false);
			else element.attachEvent('on' + type, bound);
		}

		return this;
	},
	
	ignore: function(type, fn){
		if (!this._events) return this;
		
		if (typeof type != 'string'){ // ignore type / fn with object
			for (var t in type) this.ignore(t, type[t]);
			return this;
		}
		
		var events = this._events[type];
		if (!events) return this;
		
		if (fn == null){ // ignore every of type
			events.each(function(fn, bound){
				this.ignore(type, fn);
			}, this);
		} else { // ignore one
			var bound = events.get(fn);
			if (!bound) return this;
			var element = this.element;
			if (element.removeEventListener) element.removeEventListener(type, bound, false);
			else element.detachEvent('on' + type, bound);
		}

		return this;
	}

});

ART.Container = new Class({

	grab: function(){
		for (var i = 0; i < arguments.length; i++) arguments[i].inject(this);
		return this;
	}

});

Color.detach = function(color){
	color = new Color(color);
	return [Color.rgb(color.red, color.green, color.blue).toString(), color.alpha];
};

})();


/*
---
 
script: ART.Element.js
 
description: Smarter injection methods
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

extends: ART/ART.Element

provides: ART.Element.inserters
 
...
*/

!function() {
  
var inserters = {

  before: function(context, element){
    var parent = element.parentNode;
    if (parent) parent.insertBefore(context, element);
  },

  after: function(context, element){
    var parent = element.parentNode;
    if (parent) parent.insertBefore(context, element.nextSibling);
  },

  bottom: function(context, element){
    element.appendChild(context);
  },

  top: function(context, element){
    element.insertBefore(context, element.firstChild);
  }

};

ART.Element.implement({
  inject: function(element, where){
    if (element.element) element = element.element;
    inserters[where || 'bottom'](this.element, element, true);
    return this;
  }
});

}();
/*
---
name: ART.Path
description: "Class to generate a valid SVG path using method calls."
authors: ["[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: ART.Path
requires: ART
...
*/

(function(){

/* private functions */

var parse = function(path){

	var parts = [], index = -1,
	    bits = path.match(/[a-df-z]|[\-+]?(?:[\d\.]e[\-+]?|[^\s\-+,a-z])+/ig);

	for (var i = 0, l = bits.length; i < l; i++){
		var bit = bits[i];
		if (bit.match(/^[a-z]/i)) parts[++index] = [bit];
		else parts[index].push(Number(bit));
	}
	
	return parts;

};

var circle = Math.PI * 2, north = circle / 2, west = north / 2, east = -west, south = 0;

var calculateArc = function(rx, ry, rotation, large, clockwise, x, y, tX, tY){
	var cx = x / 2, cy = y / 2,
		rxry = rx * rx * ry * ry, rycx = ry * ry * cx * cx, rxcy = rx * rx * cy * cy,
		a = rxry - rxcy - rycx;

	if (a < 0){
		a = Math.sqrt(1 - a / rxry);
		rx *= a; ry *= a;
	} else {
		a = Math.sqrt(a / (rxcy + rycx));
		if (large == clockwise) a = -a;
		cx += -a * y / 2 * rx / ry;
		cy +=  a * x / 2 * ry / rx;
	}

	var sa = Math.atan2(cx, -cy), ea = Math.atan2(-x + cx, y - cy);
	if (!+clockwise){ var t = sa; sa = ea; ea = t; }
	if (ea < sa) ea += circle;

	cx += tX; cy += tY;

	return {
		circle: [cx - rx, cy - ry, cx + rx, cy + ry],
		boundsX: [
			ea > circle + west || (sa < west && ea > west) ? cx - rx : tX,
			ea > circle + east || (sa < east && ea > east) ? cx + rx : tX
		],
		boundsY: [
			ea > north ? cy - ry : tY,
			ea > circle + south || (sa < south && ea > south) ? cy + ry : tY
		]
	};
};

var extrapolate = function(parts, precision){
	
	var boundsX = [], boundsY = [];
	
	var ux = (precision != null) ? function(x){
		boundsX.push(x); return Math.round(x * precision);
	} : function(x){
		boundsX.push(x); return x;
	}, uy = (precision != null) ? function(y){
		boundsY.push(y); return Math.round(y * precision);
	} : function(y){
		boundsY.push(y); return y;
	}, np = (precision != null) ? function(v){
		return Math.round(v * precision);
	} : function(v){
		return v;
	};

	var reflect = function(sx, sy, ex, ey){
		return [ex * 2 - sx, ey * 2 - sy];
	};
	
	var X = 0, Y = 0, px = 0, py = 0, r;
	
	var path = '', inX, inY;
	
	for (i = 0; i < parts.length; i++){
		var v = Array.slice(parts[i]), f = v.shift(), l = f.toLowerCase();
		var refX = l == f ? X : 0, refY = l == f ? Y : 0;
		
		if (l != 'm' && inX == null){
			inX = X; inY = Y;
		}

		switch (l){
			
			case 'm':
				path += 'm' + ux(X = refX + v[0]) + ',' + uy(Y = refY + v[1]);
			break;
			
			case 'l':
				path += 'l' + ux(X = refX + v[0]) + ',' + uy(Y = refY + v[1]);
			break;
			
			case 'c':
				px = refX + v[2]; py = refY + v[3];
				path += 'c' + ux(refX + v[0]) + ',' + uy(refY + v[1]) + ',' + ux(px) + ',' + uy(py) + ',' + ux(X = refX + v[4]) + ',' + uy(Y = refY + v[5]);
			break;

			case 's':
				r = reflect(px, py, X, Y);
				px = refX + v[0]; py = refY + v[1];
				path += 'c' + ux(r[0]) + ',' + uy(r[1]) + ',' + ux(px) + ',' + uy(py) + ',' + ux(X = refX + v[2]) + ',' + uy(Y = refY + v[3]);
			break;
			
			case 'q':
				px = refX + v[0]; py = refY + v[1];
				path += 'c' + ux(refX + v[0]) + ',' + uy(refY + v[1]) + ',' + ux(px) + ',' + uy(py) + ',' + ux(X = refX + v[2]) + ',' + uy(Y = refY + v[3]);
			break;
			
			case 't':
				r = reflect(px, py, X, Y);
				px = refX + r[0]; py = refY + r[1];
				path += 'c' + ux(px) + ',' + uy(py) + ',' + ux(px) + ',' + uy(py) + ',' + ux(X = refX + v[0]) + ',' + uy(Y = refY + v[1]);
			break;

			case 'a':
				px = refX + v[5]; py = refY + v[6];

				if (!+v[0] || !+v[1] || (px == X && py == Y)){
					path += 'l' + ux(X = px) + ',' + uy(Y = py);
					break;
				}
				
				v[7] = X; v[8] = Y;
				r = calculateArc.apply(null, v);

				boundsX.push.apply(boundsX, r.boundsX);
				boundsY.push.apply(boundsY, r.boundsY);

				path += (v[4] == 1 ? 'wa' : 'at') + r.circle.map(np) + ',' + ux(X) + ',' + uy(Y) + ',' + ux(X = px) + ',' + uy(Y = py);
			break;

			case 'h':
				path += 'l' + ux(X = refX + v[0]) + ',' + uy(Y);
			break;
			
			case 'v':
				path += 'l' + ux(X) + ',' + uy(Y = refY + v[0]);
			break;
			
			case 'z':
				path += 'x';
				if (inX != null){
					path += 'm' + ux(X = inX) + ',' + uy(Y = inY);
					inX = null;
				}
			break;
			
		}
	}
	
	var right = Math.max.apply(Math, boundsX),
		bottom = Math.max.apply(Math, boundsY),
		left = Math.min.apply(Math, boundsX),
		top = Math.min.apply(Math, boundsY),
		height = bottom - top,
		width = right - left;
	
	return [path, {left: left, top: top, right: right, bottom: bottom, width: width, height: height}];

};

/* Utility command factories */

var point = function(c){
	return function(x, y){
		return this.push(c, x, y);
	};
};

var arc = function(c, cc){
	return function(x, y, rx, ry, outer){
		return this.push(c, Math.abs(rx || x), Math.abs(ry || rx || y), 0, outer ? 1 : 0, cc, x, y);
	};
};

var curve = function(t, q, c){
	return function(c1x, c1y, c2x, c2y, ex, ey){
		var args = Array.slice(arguments), l = args.length;
		args.unshift(l < 4 ? t : l < 6 ? q : c);
		return this.push.apply(this, args);
	};
};

/* Path Class */

ART.Path = new Class({
	
	initialize: function(path){
		if (path instanceof ART.Path){ //already a path, copying
			this.path = Array.slice(path.path);
			this.box = path.box;
			this.vml = path.vml;
			this.svg = path.svg;
		} else {
			this.path = (path == null) ? [] : parse(path);
			this.box = null;
			this.vml = null;
			this.svg = null;
		}

		return this;
	},
	
	push: function(){ //modifying the current path resets the memoized values.
		this.box = null;
		this.vml = null;
		this.svg = null;
		this.path.push(Array.slice(arguments));
		return this;
	},
	
	reset: function(){
		this.box = null;
		this.vml = null;
		this.svg = null;
		this.path = [];
		return this;
	},
	
	/*utility*/
	
	move: point('m'),
	moveTo: point('M'),
	
	line: point('l'),
	lineTo: point('L'),
	
	curve: curve('t', 'q', 'c'),
	curveTo: curve('T', 'Q', 'C'),
	
	arc: arc('a', 1),
	arcTo: arc('A', 1),
	
	counterArc: arc('a', 0),
	counterArcTo: arc('A', 0),
	
	close: function(){
		return this.push('z');
	},
	
	/* split each continuous line into individual paths */
	
	splitContinuous: function(){
		var parts = this.path, newPaths = [], path = new ART.Path();
		
		var X = 0, Y = 0, inX, inY;
		for (i = 0; i < parts.length; i++){
			var v = parts[i], f = v[0], l = f.toLowerCase();
			
			if (l != 'm' && inX == null){ inX = X; inY = Y; }
			
			if (l != f){ X = 0; Y = 0; }
			
			if (l == 'm' || l == 'l' || l == 't'){ X += v[1]; Y += v[2]; }
			else if (l == 'c'){ X += v[5]; Y += v[6]; }
			else if (l == 's' || l == 'q'){ X += v[3]; Y += v[4]; }
			else if (l == 'a'){ X += v[6]; Y += v[7]; }
			else if (l == 'h'){ X += v[1]; }
			else if (l == 'v'){ Y += v[1]; }
			else if (l == 'z' && inX != null){
				X = inX; Y = inY;
				inX = null;
			}

			if (path.path.length > 0 && (l == 'm' || l == 'z')){
				newPaths.push(path);
				path = new ART.Path().push('M', X, Y);
			} else {
				path.path.push(v);
			}
		}

		newPaths.push(path);
		return newPaths;
	},
	
	/* transformation, measurement */
	
	toSVG: function(){
		if (this.svg == null){
			var path = '';
			for (var i = 0, l = this.path.length; i < l; i++) path += this.path[i].join(' ');
			this.svg = path;
		}
		return this.svg;
	},
	
	toVML: function(precision){
		if (this.vml == null){
			var data = extrapolate(this.path, precision);
			this.box = data[1];
			this.vml = data[0];
		}
		return this.vml;
	},
	
	measure: function(precision){
		if (this.box == null){
					
			if (this.path.length){
				var data = extrapolate(this.path, precision);
				this.box = data[1];
				this.vml = data[2];
			} else {
				this.box = {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0};
				this.vml = '';
				this.svg = '';
			}
		
		}
		
		return this.box;
	}
	
});

ART.Path.prototype.toString = ART.Path.prototype.toSVG;

})();

/*
---
name: ART.SVG
description: "SVG implementation for ART"
provides: [ART.SVG, ART.SVG.Group, ART.SVG.Shape, ART.SVG.Image, ART.SVG.Text]
requires: [ART, ART.Element, ART.Container, ART.Path]
...
*/

(function(){
	
var NS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink', UID = 0, createElement = function(tag){
	return document.createElementNS(NS, tag);
};

// SVG Base Class

ART.SVG = new Class({

	Extends: ART.Element,
	Implements: ART.Container,

	initialize: function(width, height){
		var element = this.element = createElement('svg');
		element.setAttribute('xmlns', NS);
		element.setAttribute('version', 1.1);
		var defs = this.defs = createElement('defs');
		element.appendChild(defs);
		if (width != null && height != null) this.resize(width, height);
	},

	resize: function(width, height){
		var element = this.element;
		element.setAttribute('width', width);
		element.setAttribute('height', height);
		return this;
	},
	
	toElement: function(){
		return this.element;
	}

});

// SVG Element Class

ART.SVG.Element = new Class({
	
	Extends: ART.Element,

	initialize: function(tag){
		this.uid = String.uniqueID();
		var element = this.element = createElement(tag);
		element.setAttribute('id', 'e' + this.uid);
		this.transform = {translate: [0, 0], rotate: [0, 0, 0], scale: [1, 1]};
	},
	
	/* transforms */
	
	_writeTransform: function(){
		var transforms = [];
		for (var transform in this.transform) transforms.push(transform + '(' + this.transform[transform].join(',') + ')');
		this.element.setAttribute('transform', transforms.join(' '));
	},
	
	rotate: function(deg, x, y){
		if (x == null || y == null){
			var box = this.measure();
			x = box.left + box.width / 2; y = box.top + box.height / 2;
		}
		this.transform.rotate = [deg, x, y];
		this._writeTransform();
		return this;
	},

	scale: function(x, y){
		if (y == null) y = x;
		this.transform.scale = [x, y];
		this._writeTransform();
		return this;
	},

	translate: function(x, y){
		this.transform.translate = [x, y];
		this._writeTransform();
		return this;
	},
	
	setOpacity: function(opacity){
		this.element.setAttribute('opacity', opacity);
		return this;
	},
	
	// visibility
	
	hide: function(){
		this.element.setAttribute('display', 'none');
		return this;
	},
	
	show: function(){
		this.element.setAttribute('display', '');
		return this;
	}
	
});

// SVG Group Class

ART.SVG.Group = new Class({
	
	Extends: ART.SVG.Element,
	Implements: ART.Container,
	
	initialize: function(){
		this.parent('g');
		this.defs = createElement('defs');
		this.element.appendChild(this.defs);
		this.children = [];
	},
	
	measure: function(){
		return ART.Path.measure(this.children.map(function(child){
			return child.currentPath;
		}));
	}
	
});

// SVG Base Shape Class

ART.SVG.Base = new Class({
	
	Extends: ART.SVG.Element,

	initialize: function(tag){
		this.parent(tag);
		this.fill();
		this.stroke();
	},
	
	/* insertions */
	
	inject: function(container){
		this.eject();
		if (container instanceof ART.SVG.Group) container.children.push(this);
		this.container = container;
		this._injectGradient('fill');
		this._injectGradient('stroke');
		this.parent(container);
		return this;
	},
	
	eject: function(){
		if (this.container){
			if (this.container instanceof ART.SVG.Group) this.container.children.erase(this);
			this.parent();
			this._ejectGradient('fill');
			this._ejectGradient('stroke');
			this.container = null;
		}
		return this;
	},
	
	_injectGradient: function(type){
		if (!this.container) return;
		var gradient = this[type + 'Gradient'];
		if (gradient) this.container.defs.appendChild(gradient);
	},
	
	_ejectGradient: function(type){
		if (!this.container) return;
		var gradient = this[type + 'Gradient'];
		if (gradient) this.container.defs.removeChild(gradient);
	},
	
	/* styles */
	
	_createGradient: function(type, style, stops){
		this._ejectGradient(type);

		var gradient = createElement(style + 'Gradient');

		this[type + 'Gradient'] = gradient;

		var addColor = function(offset, color){
			color = Color.detach(color);
			var stop = createElement('stop');
			stop.setAttribute('offset', offset);
			stop.setAttribute('stop-color', color[0]);
			stop.setAttribute('stop-opacity', color[1]);
			gradient.appendChild(stop);
		};

		// Enumerate stops, assumes offsets are enumerated in order
		// TODO: Sort. Chrome doesn't always enumerate in expected order but requires stops to be specified in order.
		if ('length' in stops) for (var i = 0, l = stops.length - 1; i <= l; i++) addColor(i / l, stops[i]);
		else for (var offset in stops) addColor(offset, stops[offset]);

		var id = 'g' + String.uniqueID();
		gradient.setAttribute('id', id);

		this._injectGradient(type);

		this.element.removeAttribute('fill-opacity');
		this.element.setAttribute(type, 'url(#' + id + ')');
		
		return gradient;
	},
	
	_setColor: function(type, color){
		this._ejectGradient(type);
		this[type + 'Gradient'] = null;
		var element = this.element;
		if (color == null){
			element.setAttribute(type, 'none');
			element.removeAttribute(type + '-opacity');
		} else {
			color = Color.detach(color);
			element.setAttribute(type, color[0]);
			element.setAttribute(type + '-opacity', color[1]);
		}
	},

	fill: function(color){
		if (arguments.length > 1) this.fillLinear(arguments);
		else this._setColor('fill', color);
		return this;
	},

	fillRadial: function(stops, focusX, focusY, radius, centerX, centerY){
		var gradient = this._createGradient('fill', 'radial', stops);

		if (focusX != null) gradient.setAttribute('fx', focusX);
		if (focusY != null) gradient.setAttribute('fy', focusY);

		if (radius) gradient.setAttribute('r', radius);

		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;

		if (centerX != null) gradient.setAttribute('cx', centerX);
		if (centerY != null) gradient.setAttribute('cy', centerY);

		gradient.setAttribute('spreadMethod', 'reflect'); // Closer to the VML gradient
		
		return this;
	},

	fillLinear: function(stops, angle){
		var gradient = this._createGradient('fill', 'linear', stops);

		angle = ((angle == null) ? 270 : angle) * Math.PI / 180;

		var x = Math.cos(angle), y = -Math.sin(angle),
			l = (Math.abs(x) + Math.abs(y)) / 2;

		x *= l; y *= l;

		gradient.setAttribute('x1', 0.5 - x);
		gradient.setAttribute('x2', 0.5 + x);
		gradient.setAttribute('y1', 0.5 - y);
		gradient.setAttribute('y2', 0.5 + y);

		return this;
	},

	stroke: function(color, width, cap, join){
		var element = this.element;
		element.setAttribute('stroke-width', (width != null) ? width : 1);
		element.setAttribute('stroke-linecap', (cap != null) ? cap : 'round');
		element.setAttribute('stroke-linejoin', (join != null) ? join : 'round');

		this._setColor('stroke', color);
		return this;
	}
	
});

// SVG Shape Class

ART.SVG.Shape = new Class({
	
	Extends: ART.SVG.Base,
	
	initialize: function(path){
		this.parent('path');
		this.element.setAttribute('fill-rule', 'evenodd');
		if (path != null) this.draw(path);
	},
	
	getPath: function(){
		return this.currentPath || new ART.Path;
	},
	
	draw: function(path){
		this.currentPath = (path instanceof ART.Path) ? path : new ART.Path(path);
		this.element.setAttribute('d', this.currentPath.toSVG());
		return this;
	},
	
	measure: function(){
		return this.getPath().measure();
	}

});

ART.SVG.Image = new Class({
	
	Extends: ART.SVG.Base,
	
	initialize: function(src, width, height){
		this.parent('image');
		if (arguments.length == 3) this.draw.apply(this, arguments);
	},
	
	draw: function(src, width, height){
		var element = this.element;
		element.setAttributeNS(XLINK, 'href', src);
		element.setAttribute('width', width);
		element.setAttribute('height', height);
		return this;
	}
	
});

var fontAnchors = { left: 'start', center: 'middle', right: 'end' },
    fontAnchorOffsets = { middle: '50%', end: '100%' };

ART.SVG.Text = new Class({

	Extends: ART.SVG.Base,

	initialize: function(text, font, alignment, path){
		this.parent('text');
		this.draw.apply(this, arguments);
	},
	
	draw: function(text, font, alignment, path){
		var element = this.element;
	
		if (font){
			if (typeof font == 'string'){
				element.style.font = font;
			} else {
				for (var key in font){
					var ckey = key.camelCase ? key.camelCase() : key;
					// NOT UNIVERSALLY SUPPORTED OPTIONS
					// if (ckey == 'kerning') element.setAttribute('kerning', font[key] ? 'auto' : '0');
					// else if (ckey == 'letterSpacing') element.setAttribute('letter-spacing', Number(font[key]) + 'ex');
					// else if (ckey == 'rotateGlyphs') element.setAttribute('glyph-orientation-horizontal', font[key] ? '270deg' : '');
					// else
					element.style[ckey] = font[key];
				}
				element.style.lineHeight = '0.5em';
			}
		}
		
		if (alignment) element.setAttribute('text-anchor', this.textAnchor = (fontAnchors[alignment] || alignment));

		if (path && typeof path != 'number'){
			this._createPaths(new ART.Path(path));
		} else if (path === false){
			this._ejectPaths();
			this.pathElements = null;
		}
		
		var paths = this.pathElements, child;
		
		while ((child = element.firstChild)){
			element.removeChild(child);
		}
		
		// Note: Gecko will (incorrectly) align gradients for each row, while others applies one for the entire element
		
		var lines = String(text).split(/\r?\n/), l = lines.length,
		    baseline = paths ? 'middle' : 'text-before-edge';
		
		if (paths && l > paths.length) l = paths.length;
		
		element.setAttribute('dominant-baseline', baseline);
		
		for (var i = 0; i < l; i++){
			var line = lines[i], row;
			if (paths){
				row = createElement('textPath');
				row.setAttributeNS(XLINK, 'href', '#' + paths[i].getAttribute('id'));
				row.setAttribute('startOffset', fontAnchorOffsets[this.textAnchor] || 0);
			} else {
				row = createElement('tspan');
				row.setAttribute('x', 0);
				row.setAttribute('dy', i == 0 ? '0' : '1em');
			}
			row.setAttribute('baseline-shift', paths ? '-0.5ex' : '-2ex'); // Opera
			row.setAttribute('dominant-baseline', baseline);
			row.appendChild(document.createTextNode(line));
			element.appendChild(row);
		}
	},
	
	// TODO: Unify path injection with gradients and imagefills

	inject: function(container){
		this.parent(container);
		this._injectPaths();
		return this;
	},
	
	eject: function(){
		if (this.container){
			this._ejectPaths();
			this.parent();
			this.container = null;
		}
		return this;
	},
	
	_injectPaths: function(){
		var paths = this.pathElements;
		if (!this.container || !paths) return;
		var defs = this.container.defs;
		for (var i = 0, l = paths.length; i < l; i++)
			defs.appendChild(paths[i]);
	},
	
	_ejectPaths: function(){
		var paths = this.pathElements;
		if (!this.container || !paths) return;
		var defs = this.container.defs;
		for (var i = 0, l = paths; i < l; i++)
			defs.removeChild(paths[i]);
	},
	
	_createPaths: function(path){
		this._ejectPaths();
		var id = 'p' + String.uniqueID() + '-';
		var paths = path.splitContinuous();
		var result = [];
		for (var i = 0, l = paths.length; i < l; i++){
			var p = createElement('path');
			p.setAttribute('d', paths[i].toSVG());
			p.setAttribute('id', id + i);
			result.push(p);
		}
		this.pathElements = result;
		this._injectPaths();
	},
	
	_whileInDocument: function(fn, bind){
		// Temporarily inject into the document
		var element = this.element,
		    container = this.container,
			parent = element.parentNode,
			sibling = element.nextSibling,
			body = element.ownerDocument.body,
			canvas = new ART.SVG(1, 1).inject(body);
		this.inject(canvas);
		var result = fn.call(bind);
		canvas.eject();
		if (container) this.inject(container);
		if (parent) parent.insertBefore(element, sibling);
		return result;
	},
	
	measure: function(){
		var element = this.element, bb;

		try { bb = element.getBBox(); } catch (x){ }
		if (!bb || !bb.width) bb = this._whileInDocument(element.getBBox, element);
		
		return { left: bb.x, top: bb.y, width: bb.width, height: bb.height, right: bb.x + bb.width, bottom: bb.y + bb.height };
	}

});

})();

/*
---
 
script: ART.SVG.js
 
description: Some extensions (filters, dash, shadow blur)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

extends: ART/ART.SVG

provides: [ART.SVG.prototype.dash, ART.SVG.prototype.strokeLinear, ART.SVG.prototype.fillRadial]
 
...
*/

!function() {
var NS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink', UID = 0, createElement = function(tag){
  return document.createElementNS(NS, tag);
};
  
ART.SVG.Base.implement({
  dash: function(dash) {
    if (dash) {
      this.dashed = true;
      this.element.setAttribute('stroke-dasharray', dash);
    } else if (this.dashed) {
      this.dashed = false;
      this.element.removeAttribute('stroke-dasharray')
    }
  },
  
  
  inject: function(container){
    this.eject();
    if (container instanceof ART.SVG.Group) container.children.push(this);
    this.parent.apply(this, arguments);
    this.container = container.defs ? container : container.container;
		this._injectBrush('fill');
		this._injectBrush('stroke');
    this._injectFilter('blur');
    return this;
  },
  
  strokeLinear: function(stops, angle){
    var gradient = this._createGradient('stroke', 'linear', stops);

    angle = ((angle == null) ? 270 : angle) * Math.PI / 180;

    var x = Math.cos(angle), y = -Math.sin(angle),
      l = (Math.abs(x) + Math.abs(y)) / 2;

    x *= l; y *= l;

    gradient.setAttribute('x1', 0.5 - x);
    gradient.setAttribute('x2', 0.5 + x);
    gradient.setAttribute('y1', 0.5 - y);
    gradient.setAttribute('y2', 0.5 + y);

    return this;
  },
  
  _writeTransform: function(){
    if (Object.equals(this.transformed, this.transform)) return;
    this.transformed = $unlink(this.transform);
    var transforms = [];
    for (var transform in this.transform) transforms.push(transform + '(' + this.transform[transform].join(',') + ')');
    this.element.setAttribute('transform', transforms.join(' '));
  },

  blur: function(radius){
    if (radius == null) radius = 4;
    if (radius == this.blurred) return;
    this.blurred = radius;
    
    var filter = this._createFilter();
    var blur = createElement('feGaussianBlur');
    blur.setAttribute('stdDeviation', radius * 0.25);
    blur.setAttribute('result', 'blur');
    filter.appendChild(blur);
    //in=SourceGraphic
    //stdDeviation="4" result="blur"
    return this;
  },

  unblur: function() {
    delete this.blurred;
    this._ejectFilter();
  },
  
  _injectFilter: function(type){
    if (!this.container) return;
    var filter = this.filter;
    if (filter) this.container.defs.appendChild(filter);
  },
  
  _ejectFilter: function(type){
    if (!this.container) return;
    var filter = this.filter;
    delete this.filter;
    if (filter) this.container.defs.removeChild(filter);
  },
  
  _createFilter: function(){
    this._ejectFilter();
  
    var filter = this.filter = createElement('filter');
  
    var id = 'filter-e' + this.uid;
    filter.setAttribute('id', id);
  
    this._injectFilter();
  
    this.element.setAttribute('filter', 'url(#' + id + ')');
  
    return filter;
  }
});

}();
/*
---
name: ART.VML
description: "VML implementation for ART"
authors: ["[Simo Kinnunen](http://twitter.com/sorccu)", "[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: [ART.VML, ART.VML.Group, ART.VML.Shape, ART.VML.Text]
requires: [ART, ART.Element, ART.Container, ART.Path]
...
*/

(function(){

var precision = 100, UID = 0;

// VML Base Class

ART.VML = new Class({

	Extends: ART.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.vml = document.createElement('vml');
		this.element = document.createElement('av:group');
		this.vml.appendChild(this.element);
		this.children = [];
		if (width != null && height != null) this.resize(width, height);
	},
	
	inject: function(element){
		if (element.element) element = element.element;
		element.appendChild(this.vml);
	},
	
	resize: function(width, height){
		this.width = width;
		this.height = height;
		var style = this.vml.style;
		style.pixelWidth = width;
		style.pixelHeight = height;
		
		style = this.element.style;
		style.width = width;
		style.height = height;
		
		var halfPixel = (0.5 * precision);
		
		this.element.coordorigin = halfPixel + ',' + halfPixel;
		this.element.coordsize = (width * precision) + ',' + (height * precision);

		this.children.each(function(child){
			child._transform();
		});
		
		return this;
	},
	
	toElement: function(){
		return this.vml;
	}
	
});

// VML Initialization

var VMLCSS = 'behavior:url(#default#VML);display:inline-block;position:absolute;left:0px;top:0px;';

var styleSheet, styledTags = {}, styleTag = function(tag){
	if (styleSheet) styledTags[tag] = styleSheet.addRule('av\\:' + tag, VMLCSS);
};

ART.VML.init = function(document){

	var namespaces = document.namespaces;
	if (!namespaces) return false;

	namespaces.add('av', 'urn:schemas-microsoft-com:vml');
	namespaces.add('ao', 'urn:schemas-microsoft-com:office:office');

	styleSheet = document.createStyleSheet();
	styleSheet.addRule('vml', 'display:inline-block;position:relative;overflow:hidden;');
	styleTag('fill');
	styleTag('stroke');
	styleTag('path');
	styleTag('textpath');
	styleTag('group');

	return true;

};

// VML Element Class

ART.VML.Element = new Class({
	
	Extends: ART.Element,
	
	initialize: function(tag){
		this.uid = String.uniqueID();
		if (!(tag in styledTags)) styleTag(tag);

		var element = this.element = document.createElement('av:' + tag);
		element.setAttribute('id', 'e' + this.uid);
		
		this.transform = {translate: [0, 0], scale: [1, 1], rotate: [0, 0, 0]};
	},
	
	/* dom */
	
	inject: function(container){
		this.eject();
		this.container = container;
		container.children.include(this);
		this._transform();
		this.parent(container);
		
		return this;
	},

	eject: function(){
		if (this.container){
			this.container.children.erase(this);
			this.container = null;
			this.parent();
		}
		return this;
	},

	/* transform */

	_transform: function(){
		var l = this.left || 0, t = this.top || 0,
		    w = this.width, h = this.height;
		
		if (w == null || h == null) return;
		
		var tn = this.transform,
			tt = tn.translate,
			ts = tn.scale,
			tr = tn.rotate;

		var cw = w, ch = h,
		    cl = l, ct = t,
		    pl = tt[0], pt = tt[1],
		    rotation = tr[0],
		    rx = tr[1], ry = tr[2];
		
		// rotation offset
		var theta = rotation / 180 * Math.PI,
		    sin = Math.sin(theta), cos = Math.cos(theta);
		
		var dx = w / 2 - rx,
		    dy = h / 2 - ry;
				
		pl -= cos * -(dx + l) + sin * (dy + t) + dx;
		pt -= cos * -(dy + t) - sin * (dx + l) + dy;
 
		// scale
		cw /= ts[0];
		ch /= ts[1];
		cl /= ts[0];
		ct /= ts[1];
 
		// transform into multiplied precision space		
		cw *= precision;
		ch *= precision;
		cl *= precision;
		ct *= precision;

		pl *= precision;
		pt *= precision;
		w *= precision;
		h *= precision;
		
		var element = this.element;
		element.coordorigin = cl + ',' + ct;
		element.coordsize = cw + ',' + ch;
		element.style.left = pl;
		element.style.top = pt;
		element.style.width = w;
		element.style.height = h;
		element.style.rotation = rotation;
	},
	
	// transformations
	
	translate: function(x, y){
		this.transform.translate = [x, y];
		this._transform();
		return this;
	},
	
	scale: function(x, y){
		if (y == null) y = x;
		this.transform.scale = [x, y];
		this._transform();
		return this;
	},
	
	rotate: function(deg, x, y){
		if (x == null || y == null){
			var box = this.measure(precision);
			x = box.left + box.width / 2; y = box.top + box.height / 2;
		}
		this.transform.rotate = [deg, x, y];
		this._transform();
		return this;
	},
	
	// visibility
	
	hide: function(){
		this.element.style.display = 'none';
		return this;
	},
	
	show: function(){
		this.element.style.display = '';
		return this;
	}
	
});

// VML Group Class

ART.VML.Group = new Class({
	
	Extends: ART.VML.Element,
	Implements: ART.Container,
	
	initialize: function(){
		this.parent('group');
		this.children = [];
	},
	
	/* dom */
	
	inject: function(container){
		this.parent(container);
		this.width = container.width;
		this.height = container.height;
		this._transform();
		return this;
	},
	
	eject: function(){
		this.parent();
		this.width = this.height = null;
		return this;
	}

});

// VML Base Shape Class

ART.VML.Base = new Class({

	Extends: ART.VML.Element,
	
	initialize: function(tag){
		this.parent(tag);
		var element = this.element;

		var fill = this.fillElement = document.createElement('av:fill');
		fill.on = false;
		element.appendChild(fill);
		
		var stroke = this.strokeElement = document.createElement('av:stroke');
		stroke.on = false;
		element.appendChild(stroke);
	},
	
	/* styles */

	_createGradient: function(style, stops){
		var fill = this.fillElement;

		// Temporarily eject the fill from the DOM
		this.element.removeChild(fill);

		fill.type = style;
		fill.method = 'none';
		fill.rotate = true;

		var colors = [], color1, color2;

		var addColor = function(offset, color){
			color = Color.detach(color);
			if (color1 == null) color1 = color;
			else color2 = color;
			colors.push(offset + ' ' + color[0]);
		};

		// Enumerate stops, assumes offsets are enumerated in order
		if ('length' in stops) for (var i = 0, l = stops.length - 1; i <= l; i++) addColor(i / l, stops[i]);
		else for (var offset in stops) addColor(offset, stops[offset]);
		
		fill.color = color1[0];
		fill.color2 = color2[0];
		
		//if (fill.colors) fill.colors.value = colors; else
		fill.colors = colors;

		// Opacity order gets flipped when color stops are specified
		fill.opacity = color2[1];
		fill['ao:opacity2'] = color1[1];

		fill.on = true;
		this.element.appendChild(fill);
		return fill;
	},
	
	_setColor: function(type, color){
		var element = this[type + 'Element'];
		if (color == null){
			element.on = false;
		} else {
			color = Color.detach(color);
			element.color = color[0];
			element.opacity = color[1];
			element.on = true;
		}
	},
	
	fill: function(color){
		if (arguments.length > 1){
			this.fillLinear(arguments);
		} else {
			var fill = this.fillElement;
			fill.type = 'solid';
			fill.color2 = '';
			fill['ao:opacity2'] = '';
			if (fill.colors) fill.colors.value = '';
			this._setColor('fill', color);
		}
		return this;
	},

	fillRadial: function(stops, focusX, focusY, radius){
		var fill = this._createGradient('gradientradial', stops);
		fill.focus = 50;
		fill.focussize = '0 0';
		fill.focusposition = (focusX == null ? 0.5 : focusX) + ',' + (focusY == null ? 0.5 : focusY);
		fill.focus = (radius == null || radius > 0.5) ? '100%' : (Math.round(radius * 200) + '%');
		return this;
	},

	fillLinear: function(stops, angle){
		var fill = this._createGradient('gradient', stops);
		fill.focus = '100%';
		fill.angle = (angle == null) ? 0 : (90 + angle) % 360;
		return this;
	},

	/* stroke */
	
	stroke: function(color, width, cap, join){
		var stroke = this.strokeElement;
		stroke.weight = (width != null) ? (width / 2) + 'pt' : 1;
		stroke.endcap = (cap != null) ? ((cap == 'butt') ? 'flat' : cap) : 'round';
		stroke.joinstyle = (join != null) ? join : 'round';

		this._setColor('stroke', color);
		return this;
	}

});

// VML Shape Class

ART.VML.Shape = new Class({

	Extends: ART.VML.Base,
	
	initialize: function(path){
		this.parent('shape');

		var p = this.pathElement = document.createElement('av:path');
		p.gradientshapeok = true;
		this.element.appendChild(p);
		
		if (path != null) this.draw(path);
	},
	
	getPath: function(){
		return this.currentPath;
	},
	
	// SVG to VML
	
	draw: function(path){
		
		this.currentPath = (path instanceof ART.Path) ? path : new ART.Path(path);
		this.currentVML = this.currentPath.toVML(precision);
		var size = this.currentPath.measure(precision);
		
		this.right = size.right;
		this.bottom = size.bottom;
		this.top = size.top;
		this.left = size.left;
		this.height = size.height;
		this.width = size.width;
		
		this._transform();
		this._redraw(this._radial);
		
		return this;
	},
	
	measure: function(){
		return this.getPath().measure();
	},
	
	// radial gradient workaround

	_redraw: function(radial){
		var vml = this.currentVML || '';

		this._radial = radial;
		if (radial){
			var cx = Math.round((this.left + this.width * radial.x) * precision),
				cy = Math.round((this.top + this.height * radial.y) * precision),

				rx = Math.round(this.width * radial.r * precision),
				ry = Math.round(this.height * radial.r * precision),

				arc = ['wa', cx - rx, cy - ry, cx + rx, cy + ry].join(' ');

			vml = [
				// Resolve rendering bug
				'm', cx, cy - ry, 'l', cx, cy - ry,

				// Merge existing path
				vml,

				// Draw an ellipse around the path to force an elliptical gradient on any shape
				'm', cx, cy - ry,
				arc, cx, cy - ry, cx, cy + ry, arc, cx, cy + ry, cx, cy - ry,
				arc, cx, cy - ry, cx, cy + ry, arc, cx, cy + ry, cx, cy - ry,

				// Don't stroke the path with the extra ellipse, redraw the stroked path separately
				'ns e', vml, 'nf'
			
			].join(' ');
		}

		this.element.path = vml + 'e';
	},

	fill: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillLinear: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillRadial: function(stops, focusX, focusY, radius, centerX, centerY){
		this.parent.apply(this, arguments);

		if (focusX == null) focusX = 0.5;
		if (focusY == null) focusY = 0.5;
		if (radius == null) radius = 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;
		
		centerX += centerX - focusX;
		centerY += centerY - focusY;
		
		// Compensation not needed when focusposition is applied out of document
		//focusX = (focusX - centerX) / (radius * 4) + 0.5;
		//focusY = (focusY - centerY) / (radius * 4) + 0.5;

		this.fillElement.focus = '50%';
		//this.fillElement.focusposition = focusX + ',' + focusY;

		this._redraw({x: centerX, y: centerY, r: radius * 2});

		return this;
	}

});

var fontAnchors = { start: 'left', middle: 'center', end: 'right' };

ART.VML.Text = new Class({

	Extends: ART.VML.Base,

	initialize: function(text, font, alignment, path){
		this.parent('shape');
		
		var p = this.pathElement = document.createElement('av:path');
		p.textpathok = true;
		this.element.appendChild(p);
		
		p = this.textPathElement = document.createElement("av:textpath");
		p.on = true;
		p.style['v-text-align'] = 'left';
		this.element.appendChild(p);
		
		this.draw.apply(this, arguments);
	},
	
	draw: function(text, font, alignment, path){
		var element = this.element,
		    textPath = this.textPathElement,
		    style = textPath.style;
		
		textPath.string = text;
		
		if (font){
			if (typeof font == 'string'){
				style.font = font;
			} else {
				for (var key in font){
					var ckey = key.camelCase ? key.camelCase() : key;
					if (ckey == 'fontFamily') style[ckey] = "'" + font[key] + "'";
					// NOT UNIVERSALLY SUPPORTED OPTIONS
					// else if (ckey == 'kerning') style['v-text-kern'] = !!font[key];
					// else if (ckey == 'rotateGlyphs') style['v-rotate-letters'] = !!font[key];
					// else if (ckey == 'letterSpacing') style['v-text-spacing'] = Number(font[key]) + '';
					else style[ckey] = font[key];
				}
			}
		}
		
		if (alignment) style['v-text-align'] = fontAnchors[alignment] || alignment;
		
		if (path){
			this.currentPath = path = new ART.Path(path);
			this.element.path = path.toVML(precision);
		} else if (!this.currentPath){
			var i = -1, offsetRows = '\n';
			while ((i = text.indexOf('\n', i + 1)) > -1) offsetRows += '\n';
			textPath.string = offsetRows + textPath.string;
			this.element.path = 'm0,0l1,0';
		}
		
		// Measuring the bounding box is currently necessary for gradients etc.
		
		// Clone element because the element is dead once it has been in the DOM
		element = element.cloneNode(true);
		style = element.style;
		
		// Reset coordinates while measuring
		element.coordorigin = '0,0';
		element.coordsize = '10000,10000';
		style.left = '0px';
		style.top = '0px';
		style.width = '10000px';
		style.height = '10000px';
		style.rotation = 0;
		
		// Inject the clone into the document
		
		var canvas = new ART.VML(1, 1),
		    group = new ART.VML.Group(), // Wrapping it in a group seems to alleviate some client rect weirdness
		    body = element.ownerDocument.body;
		
		canvas.inject(body);
		group.element.appendChild(element);
		group.inject(canvas);
		
		var ebb = element.getBoundingClientRect(),
		    cbb = canvas.toElement().getBoundingClientRect();
		
		canvas.eject();
		
		this.left = ebb.left - cbb.left;
		this.top = ebb.top - cbb.top;
		this.width = ebb.right - ebb.left;
		this.height = ebb.bottom - ebb.top;
		this.right = ebb.right - cbb.left;
		this.bottom = ebb.bottom - cbb.top;
		
		this._transform();
	},
	
	measure: function(){
		return { left: this.left, top: this.top, width: this.width, height: this.height, right: this.right, bottom: this.bottom };
	}
	
});

})();

/*
---
name: ART.Base
description: "Implements ART, ART.Shape and ART.Group based on the current browser."
provides: [ART.Base, ART.Group, ART.Shape, ART.Text]
requires: [ART.VML, ART.SVG]
...
*/

(function(){
	
var SVG = function(){

	var implementation = document.implementation;
	return (implementation && implementation.hasFeature && implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

};

var VML = function(){

	return ART.VML.init(document);

};

var MODE = SVG() ? 'SVG' : VML() ? 'VML' : null;
if (!MODE) return;

ART.Shape = new Class({Extends: ART[MODE].Shape});
ART.Group = new Class({Extends: ART[MODE].Group});
ART.Text = new Class({Extends: ART[MODE].Text});
ART.implement({Extends: ART[MODE]});

})();

/*
---

script: More.js

name: More

description: MooTools More

license: MIT-style license

authors:
  - Guillermo Rauch
  - Thomas Aylott
  - Scott Kyle
  - Arian Stolwijk
  - Tim Wienk
  - Christoph Pojer
  - Aaron Newton
  - Jacob Thornton

requires:
  - Core/MooTools

provides: [MooTools.More]

...
*/

MooTools.More = {
	'version': '1.3.2.2dev',
	'build': '%build%'
};

/*
---

script: Class.Binds.js

name: Class.Binds

description: Automagically binds specified methods in a class to the instance of the class.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Class
  - /MooTools.More

provides: [Class.Binds]

...
*/

Class.Mutators.Binds = function(binds){
	if (!this.prototype.initialize) this.implement('initialize', function(){});
	return Array.from(binds).concat(this.prototype.Binds || []);
};

Class.Mutators.initialize = function(initialize){
	return function(){
		Array.from(this.Binds).each(function(name){
			var original = this[name];
			if (original) this[name] = original.bind(this);
		}, this);
		return initialize.apply(this, arguments);
	};
};


/*
---

script: Class.Binds.js

description: Removes mutators added by Class.Binds that breaks multiple inheritance

license: MIT-style license

authors:
  - Aaron Newton

extends: More/Class.Binds
...
*/

//empty

delete Class.Mutators.Binds;
delete Class.Mutators.initialize;
/*
---

script: String.QueryString.js

name: String.QueryString

description: Methods for dealing with URI query strings.

license: MIT-style license

authors:
  - Sebastian Markbåge
  - Aaron Newton
  - Lennart Pilon
  - Valerio Proietti

requires:
  - Core/Array
  - Core/String
  - /MooTools.More

provides: [String.QueryString]

...
*/

String.implement({

	parseQueryString: function(decodeKeys, decodeValues){
		if (decodeKeys == null) decodeKeys = true;
		if (decodeValues == null) decodeValues = true;

		var vars = this.split(/[&;]/),
			object = {};
		if (!vars.length) return object;

		vars.each(function(val){
			var index = val.indexOf('=') + 1,
				value = index ? val.substr(index) : '',
				keys = index ? val.substr(0, index - 1).match(/([^\]\[]+|(\B)(?=\]))/g) : [val],
				obj = object;
			if (!keys) return;
			if (decodeValues) value = decodeURIComponent(value);
			keys.each(function(key, i){
				if (decodeKeys) key = decodeURIComponent(key);
				var current = obj[key];

				if (i < keys.length - 1) obj = obj[key] = current || {};
				else if (typeOf(current) == 'array') current.push(value);
				else obj[key] = current != null ? [current, value] : value;
			});
		});

		return object;
	},

	cleanQueryString: function(method){
		return this.split('&').filter(function(val){
			var index = val.indexOf('='),
				key = index < 0 ? '' : val.substr(0, index),
				value = val.substr(index + 1);

			return method ? method.call(null, key, value) : (value || value === 0);
		}).join('&');
	}

});

/*
---

name: Object

description: Object generic methods

license: MIT-style license.

requires: Type

provides: [Object, Hash]

...
*/

(function(){

var hasOwnProperty = Object.prototype.hasOwnProperty;

Object.extend({

	subset: function(object, keys){
		var results = {};
		for (var i = 0, l = keys.length; i < l; i++){
			var k = keys[i];
			if (k in object) results[k] = object[k];
		}
		return results;
	},

	map: function(object, fn, bind){
		var results = {};
		for (var key in object){
			if (hasOwnProperty.call(object, key)) results[key] = fn.call(bind, object[key], key, object);
		}
		return results;
	},

	filter: function(object, fn, bind){
		var results = {};
		for (var key in object){
			var value = object[key];
			if (hasOwnProperty.call(object, key) && fn.call(bind, value, key, object)) results[key] = value;
		}
		return results;
	},

	every: function(object, fn, bind){
		for (var key in object){
			if (hasOwnProperty.call(object, key) && !fn.call(bind, object[key], key)) return false;
		}
		return true;
	},

	some: function(object, fn, bind){
		for (var key in object){
			if (hasOwnProperty.call(object, key) && fn.call(bind, object[key], key)) return true;
		}
		return false;
	},

	keys: function(object){
		var keys = [];
		for (var key in object){
			if (hasOwnProperty.call(object, key)) keys.push(key);
		}
		return keys;
	},

	values: function(object){
		var values = [];
		for (var key in object){
			if (hasOwnProperty.call(object, key)) values.push(object[key]);
		}
		return values;
	},

	getLength: function(object){
		return Object.keys(object).length;
	},

	keyOf: function(object, value){
		for (var key in object){
			if (hasOwnProperty.call(object, key) && object[key] === value) return key;
		}
		return null;
	},

	contains: function(object, value){
		return Object.keyOf(object, value) != null;
	},

	toQueryString: function(object, base){
		var queryString = [];

		Object.each(object, function(value, key){
			if (base) key = base + '[' + key + ']';
			var result;
			switch (typeOf(value)){
				case 'object': result = Object.toQueryString(value, key); break;
				case 'array':
					var qs = {};
					value.each(function(val, i){
						qs[i] = val;
					});
					result = Object.toQueryString(qs, key);
				break;
				default: result = key + '=' + encodeURIComponent(value);
			}
			if (value != null) queryString.push(result);
		});

		return queryString.join('&');
	}

});

})();

//<1.2compat>

Hash.implement({

	has: Object.prototype.hasOwnProperty,

	keyOf: function(value){
		return Object.keyOf(this, value);
	},

	hasValue: function(value){
		return Object.contains(this, value);
	},

	extend: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.set(this, key, value);
		}, this);
		return this;
	},

	combine: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.include(this, key, value);
		}, this);
		return this;
	},

	erase: function(key){
		if (this.hasOwnProperty(key)) delete this[key];
		return this;
	},

	get: function(key){
		return (this.hasOwnProperty(key)) ? this[key] : null;
	},

	set: function(key, value){
		if (!this[key] || this.hasOwnProperty(key)) this[key] = value;
		return this;
	},

	empty: function(){
		Hash.each(this, function(value, key){
			delete this[key];
		}, this);
		return this;
	},

	include: function(key, value){
		if (this[key] == null) this[key] = value;
		return this;
	},

	map: function(fn, bind){
		return new Hash(Object.map(this, fn, bind));
	},

	filter: function(fn, bind){
		return new Hash(Object.filter(this, fn, bind));
	},

	every: function(fn, bind){
		return Object.every(this, fn, bind);
	},

	some: function(fn, bind){
		return Object.some(this, fn, bind);
	},

	getKeys: function(){
		return Object.keys(this);
	},

	getValues: function(){
		return Object.values(this);
	},

	toQueryString: function(base){
		return Object.toQueryString(this, base);
	}

});

Hash.extend = Object.append;

Hash.alias({indexOf: 'keyOf', contains: 'hasValue'});

//</1.2compat>

/*
---
 
script: Base.js
 
description: Speedy function that checks equality of objects (doing some nasty type assumption)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

extends: Core/Object

*/



Object.equals = function(one, another) {
  if (one == another) return true;
  if ((!one) ^ (!another)) return false;
  if (typeof one == 'undefined') return false;
  
  if ((one instanceof Array) || one.callee) {
    var j = one.length;
    if (j != another.length) return false;
    for (var i = 0; i < j; i++) if (!Object.equals(one[i], another[i])) return false;
    return true;
  } else if (one instanceof Color) {
    return (one.red == another.red) && (one.green == another.green) && (one.blue == another.blue) && (one.alpha == another.alpha)
  } else if (typeof one == 'object') {
    if (one.equals) return one.equals(another)
    for (var i in one) if (!Object.equals(one[i], another[i])) return false;
    return true;
  }
  return false;
};
/*
---
 
script: LSD.js
 
description: LSD namespace definition
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Core/Class
  - Core/Events
  - Core/Options
  - Core/Browser
  - Core/Object
  - Ext/Macro
  - Ext/States
  - Ext/Class.mixin
  - Ext/FastArray
  - Ext/Class.Mutators.Includes
 
provides: 
  - LSD
 
...
*/

if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function() {};

var LSD = Object.append(new Events, {
  Events: {},
  Attributes: {
    Numeric: Array.fast('tabindex', 'width', 'height'),
    Boolean: Array.fast('readonly', 'disabled', 'hidden')
  },
  Styles: {},
  States: {
    Known: {
      built:    {enabler: 'build',      disabler: 'destroy',   reflect: false},
      attached: {enabler: 'attach',     disabler: 'detach',    reflect: false},
      hidden:   {enabler: 'hide',       disabler: 'show'},
      disabled: {enabler: 'disable',    disabler: 'enable'},   
      focused:  {enabler: 'focus',      disabler: 'blur'},     
      selected: {enabler: 'select',     disabler: 'unselect'}, 
      checked:  {enabler: 'check',      disabler: 'uncheck',   toggler: 'toggle'},
      expanded: {enabler: 'expand',     disabler: 'collapse',  toggler: 'toggle'},
      working:  {enabler: 'busy',       disabler: 'idle'},
      chosen:   {enabler: 'choose',     disabler: 'forget'},
      empty:    {enabler: 'empty',      disabler: 'fill',      property: 'unfilled', initial: true},
      invalid:  {enabler: 'invalidate', disabler: 'validate',   events: {enabler: 'invalid', disabler: 'valid'}},
      valid:    {enabler: 'validate',   disabler: 'invalidate', events: {enabler: 'valid', disabler: 'invalid'}}
    },
    Positive: {
      disabled: 'disabled',
      focused: 'focused'
    },
    Negative: {
      enabled: 'disabled',
      blured: 'focused'
    },
    Attributes: {
      disabled: 'disabled',
      hidden: 'hidden'
    },
    Classes: {
      selected: 'selected',
      empty: 'empty'
    }
  },
  Options: {},
  useNative: true
});

Object.append(LSD, {
  position: function(box, size, x, y) {
    var position = {x: 0, y: 0};

    switch (x) {
      case "left":
        position.x = 0;
      case "right":
        position.x = box.width - size.width;
      case "center":
        position.x = (box.width - size.width) / 2;
    }
    switch (y) {
      case "top":
        position.y = 0;
      case "bottom":
        position.y = box.height - size.height;
      case "center":
        position.y = (box.height- size.height) / 2;
    }
    return position;
  },
  
  toLowerCase: function(lowercased) {
    return function(string) { 
      return (lowercased[string]) || (lowercased[string] = string.toLowerCase())
    }
  }(LSD.lowercased = {}),
  
  capitalize: function(capitalized) {
    return function(string) {
      return (capitalized[string]) || (capitalized[string] = string.capitalize())
    }
  }(LSD.capitalized = {}),
  
  toClassName: function(classnamed) {
    return function(string) {
      return (classnamed[string]) || (classnamed[string] = string.replace(/(^|-)([a-z])/g, function(a, b, c) { return (b ? '.' : '') + c.toUpperCase()}))
    }
  }(LSD.classnamed = {}),
  
  uid: function(object) {
    if (object.lsd) return object.lsd;
    if (object.localName) return $uid(object);
    return (object.lsd = ++LSD.UID); 
  },
  
  UID: 0,
  
  slice: (Browser.ie ? function(list, start) {
    for (var i = start || 0, j = list.length, ary = []; i < j; i++) ary.push(list[i]);
    return ary;
  } : function(list, start) {
    return Array.prototype.slice.call(list, start || 0);
  })
});


States.get = function(name) { 
  return LSD.States.Known[name];
};

/*
---
 
script: Checkbox.js
 
description: Abstract command
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
 
provides: 
  - LSD.Command
  - LSD.Command.Command
 
...
*/

LSD.Command = new Class({
  options: {
    id: null,
    action: null
  },
  
  Implements: [Options, Events, States],
  
  initialize: function(document, options) {
    this.setOptions(options);
    if (document) {
      this.document = document;
      if (!this.document.commands) this.document.commands = {};
      this.document.commands[this.options.id] = this;
    }
  },
  
  click: function() {
    this.fireEvent('click', arguments);
  },
  
  attach: function(widget) {
    var states = this.$states;
    var events = widget.events._command = {}, self = this;
    Object.each(states, function(state, name) {
      events[state.enabler] = function() {
        self[state.enabler].apply(widget, arguments)
      }
      events[state.disabler] = function() {
        self[state.disabler].apply(widget, arguments)
      }
    });
    if (widget.options.events.command) this.addEvents(widget.options.events.command);
    this.addEvents(events);
  },
  
  detach: function(widget) {
    if (widget.options.events.command) this.removeEvents(widget.options.events.command);
		var events = widget.events._command;
		if (events) this.removeEvents(events);
  }
});

LSD.Command.prototype.addState('disabled');

LSD.Command.Command = LSD.Command;
/*
---
 
script: Checkbox.js
 
description: Two-state command (can be on and off)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Command
 
provides: 
  - LSD.Command.Checkbox
 
...
*/

/*
  Checkbox commands are useful when you need to track and toggle
  state of some linked object. 
  
  Provide your custom logic hooking on *check* and *uncheck*
  state transitions. Use *checked* property to get the current state.
  
  Examples:
    - Button that toggles visibility of a sidebar
    - Context menu item that shows or hides line numbers in editor
*/

LSD.Command.Checkbox = new Class({
  Extends: LSD.Command,
  
  options: {
    states: Array.fast('checked')
  },

  click: function() {
    this.parent.apply(this, arguments);
    this.toggle();
  }
});
/*
---
 
script: Radio.js
 
description: A command that is linked with others by name (one of many)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Command
 
provides: 
  - LSD.Command.Radio
 
...
*/

/*
  Radio groupping is a way to links commands together to allow
  only one in the group be active at the moment of time.
  
  Activation (*check*ing) of the commands deactivates all 
  other commands in a radiogroup.
  
  Examples: 
    - Tabs on top of a content window
    - List of currently open documents in a context menu that
      shows which of them is the one you edit now and an 
      ability to switch between documents
*/

LSD.Command.Radio = new Class({
  Extends: LSD.Command,
  
  options: {
    radiogroup: false
  },
  
  initialize: function() {
    this.parent.apply(this, arguments);
    var name = this.options.radiogroup || this.options.name;
    if (name) {
      var groups = this.document.radiogroups;
      if (!groups) groups = this.document.radiogroups = {};
      var group = groups[name];
      if (!group) group = groups[name] = [];
      group.push(this);
      this.group = group;
    }
    this.addEvent('check', function() {
      group.each(function(command) {
        if (command != this) command.uncheck();
      }, this);
    })
  },
  
  click: function() {
    this.parent.apply(this, arguments);
    this.check();
  }
});

LSD.Command.prototype.addState('checked');
/*
---
 
script: Action.js
 
description: Action is a class that adds some feature to widget by mixing up in runtime
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD
 
provides: 
  - LSD.Action
 
...
*/


LSD.Action = function(options, name) {
  var target, state;
  var self = {
    options: options,
    
    enable: function() {
      if (self.enabled) return false;
      self.commit(target, state, arguments, target);
      if (options.events) target.addEvents(target.events[options.events]);
      if (self.enabled == null) target.addEvents(events);
      self.enabled = true;
      return true;
    },

    disable: function() {
      if (!self.enabled) return false;
      self.revert(target, state, arguments, target);
      if (options.events) target.removeEvents(target.events[options.events]);
      if (self.enabled != null) target.removeEvents(events);
      self.enabled = false;
      return true;
    },
    
    commit: function(target, state, args, bind) {
      if (state) target[state.enabler]();
      var result = options.enable.apply(bind || this, [target].concat(args));
      return result;
    },
    
    revert: function(target, state, args, bind) {
      if (state) target[state.disabler]();
      return options.disable.apply(bind || this, [target].concat(args));
    },
    
    perform: function(target, state, args) {
      var method = (!options.getState || !options.getState.apply(this, [target].concat(args))) ? 'commit' : 'revert';
      return this[method].apply(this, arguments);
    },

    use: function(widget, state) {
      var widgets = Array.prototype.slice.call(arguments, 0);
      var state = widgets.pop();
      self[state ? 'enable' : 'disable'].apply(self, widgets);
    },

    watch: function(widget, state) {
      if (!self[state ? 'enable' : 'disable'](widget)) //try enable the action
        options[state ? 'enable' : 'disable'].call(target, widget); //just fire the callback 
    },
    
    inject: function() {
      self.enable();
      if (state) self[state.enabler]();
    },

    attach: function(widget) {
      target = widget;
      state = name && widget.$states && widget.$states[name];
      if (state) {
        events[state.enabler] = options.enable.bind(target);
        events[state.disabler] = options.disabler.bind(target);
      }
      target.addEvents(events);
      if (options.uses) {
        target.use(options.uses, self.use);
      } else if (options.watches) {
        target.watch(options.watches, self.watch);
      } else if (!state || (name && target[name])) {
        if (target.onDOMInject) target.onDOMInject(self.inject);
        else self.inject()
      }
    },

    detach: function(widget) {
      target.removeEvents(events);
      if (options.watches) target.unwatch(options.watches, self.watch);
      if (self.enabled) self.disable();
      if (state) {
        self[state.disabler]();
        delete events[state.enabler], events[state.disabler];
      }
      target = state = null;
    },
    
    store: function(key, value) {
      if (!this.storage) this.storage = {};
      if (!key.indexOf && (typeof key !== 'number')) key = LSD.uid(key);
      this.storage[key] = value;
     },
    
    retrieve: function(key) {
      if (!this.storage) return;
      if (!key.indexOf && (typeof key !== 'number')) key = LSD.uid(key);
      return this.storage[key];
    }
  };
  for (var methods = ['enable', 'disable'], i, method; method = methods[i++];) {
    var fn = options[method];
    if (fn && !fn.call) {
      var types = fn;
      options[method] = function(target) {
        var callback = types[typeOf(target)];
        if (callback) return callback.apply(this, arguments);
      }
    }
  }
  var events = {
    enable:  self.enable,
    disable: self.disable,
    detach:  self.disable
  };  
  return self;
};

LSD.Action.build = function(curry) {
  return function(options, name) {
    return new LSD.Action(Object.append({}, options, curry), name);
  };
};
/*
---
 
script: Create.js
 
description: Creates a layout based on selector object or DOM elements
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Create
 
...
*/


LSD.Action.Create = LSD.Action.build({
  enable: function(target) {
    
  }
});
/*
---
 
script: Update.js
 
description: Update widget with html or json
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Update

...
*/

LSD.Action.Update = LSD.Action.build({
  enable: function(target, content) {
    var widget = LSD.Module.DOM.find(target);
    var fragment = document.createFragment(content);
    var children = Array.prototype.slice.call(fragment.childNodes, 0);
    document.id(target).empty().appendChild(fragment);
    widget.fireEvent('DOMNodeInserted', children);
  }
});
/*
---

script: Delete.js

description: Deletes a widget or element

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Action

provides:
  - LSD.Action.Delete

...
*/


LSD.Action.Delete = LSD.Action.build({
  enable: function(target) {
    if (!target.lsd) {
      var widget = LSD.Module.DOM.find(target);
      LSD.Module.DOM.walk(target, function(node) {
        widget.dispatchEvent('nodeRemoved', node);
      });
    }
    target.dispose();
    if (target.getModel) return target.getModel()['delete']()
  }
});
/*
---
 
script: Value.js
 
description: Changes or synchronizes values
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Value
 
...
*/
/*
---
 
script: Replace.js
 
description: Replaces one widget with another
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Replace
 
...
*/


LSD.Action.Replace = LSD.Action.build({
  enable: function(target, content) {
    var widget = LSD.Module.DOM.find(target);
    if (widget == target) widget = widget.parentNode;
		var fragment = document.createFragment(content);
    var children = Array.prototype.slice.call(fragment.childNodes, 0);
    if (content) target.parentNode.replaceChild(fragment, target);
    widget.fireEvent('DOMNodeInserted', children);
  }
});
/*
---
 
script: Send.js
 
description: Does a request or navigates url to the link
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Send
 
...
*/


LSD.Action.Send = LSD.Action.build({
  enable: function(target, data, callback) {
    return (target.submit || target.send).apply(target, Array.prototype.slice.call(arguments, 1));
  }
});
/*
---
 
script: State.js
 
description: Changes the state of a widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.State
 
...
*/

LSD.Action.State = LSD.Action.build({
  enable: function(target, name) {
    target.addClass(name);
  },
  
  disable: function(target, name) {
    target.removeClass(name);
  },
  
  getState: function(target, name, state) {
    return (state !== true && state !== false) ? target.hasClass(name) : state;
  }
});
/*
---
 
script: Set.js
 
description: Changes or synchronizes values
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Set
 
...
*/

LSD.Action.Set = LSD.Action.build({
  enable: function(target, value) {
    switch (Element.get(target, 'tag')) {
      case 'input': case 'textarea':
        if (target.applyValue) target.applyValue(value);
        else target.value = value; break;
      default: 
        if (!target.lsd) target.set('html', value); break;
    }
  }
});
/*
---
 
script: Display.js
 
description: Shows or hides things
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Display
 
...
*/

LSD.Action.Display = LSD.Action.build({
  enable: function(target) {
    if (target.show) target.show();
    else if (target.setStyle) {
      target.setStyle('display', target.retrieve('style:display') || 'inherit');
      target.removeAttribute('hidden');
    }
  },
  
  disable: function(target) {
    if (target.hide) target.hide();
    else if (target.setStyle) {
      target.store('style:display', target.getStyle('display'));
      target.setStyle('display', 'none');
      target.setAttribute('hidden', 'hidden');
    }
  },
  
  getState: function(target) {
    var element = (target.element || target);
    return !(target.hidden || (target.getAttribute && target.getAttribute('hidden')) || (element.getStyle && (element.getStyle('display') == 'none')));
  }
});
/*
---
 
script: Dialog.js
 
description: Shows a dialog
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Dialog
 
...
*/


LSD.Action.Dialog = LSD.Action.build({
  enable: function(target, data) {
    if (data && !data.event) {
      if (data.charAt) {
        var content = data;
        delete data;
      }
    } else delete data;
    if (target.element) {
      var dialog = target;
      target = target.element;
    } else var dialog = this.retrieve(target);
    if (dialog && dialog.layout.interpolated) {
      dialog.destroy();
      dialog = null;
    }
    if (!dialog) {
      var source = this.caller.element || this.caller;
      var caller = this.caller;
      var options = {
        layout: {
          options: {
            method: 'clone', 
            interpolate: function(string) {
              if (data) {
                var substitution = data[string];
                if (!substitution && substitutions.callback) substitution = substitutions.callback.call(this, string)
                if (substitution) {
                  if (substitution.call) substitution = substitution.call(source, string, this);
                  if (substitution) return substitution;
                }
              }
              return source.getProperty('data-' + string.dasherize())
            }
          }
        },
        caller: function() {
          return caller;
        }
      };
      var args = [options];
      if (!target.indexOf) {
        if (target.hasClass('singlethon')) options.layout.options.method = 'augment';
        args.unshift('body-dialog', target);
      } else args.unshift('body-dialog-' + target)
      dialog = LSD.Element.create.apply(LSD.Element, args);
      dialog.addEvents({
        'submit': function() {
          if (caller.callChain) caller.callChain(dialog.getData())
        }.bind(this),
        'cancel': function() {
          if (caller.clearChain) caller.clearChain(dialog.getData())
        }.bind(this)
      })
    }
    if (content) dialog.write(content);
    dialog.show();
    this.store(target, dialog);
    return false;
  },
  
  disable: function(target) {
    var dialog = this.retrieve(target);
    if (dialog) dialog.hide();
  }
});
/*
---
 
script: Check.js
 
description: Changes the state of a widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Check
 
...
*/


LSD.Action.Check = LSD.Action.build({
  enable: function(target) {
    if (!target || target == this.caller || target.element == this.caller) return;
    if (!target.checked) (target.check || target.click).apply(target, Array.prototype.slice.call(arguments, 1));
  },
  
  disable: function(target) {
    if (!target || target == this.caller || target.element == this.caller) return;
    if (target.checked) (target.uncheck || target.click).apply(target, Array.prototype.slice.call(arguments, 1));
  },
  
  getState: function(target, name, state) {
    return (state !== true && state !== false) ? !this.caller.checked : state;
  }
});
/*
---
 
script: Clone.js
 
description: Clones an element and inserts it back to parent again
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Clone
 
...
*/


LSD.Action.Clone = LSD.Action.build({
  enable: function(target) {
    var widget = LSD.Module.DOM.find(target);
    if (widget == target) var element = widget.element, parent = widget.parentNode;
    else var element = target, parent = widget;
    var clone = this.document.layout.render(element, parent, 'clone');
    (clone.toElement ? clone.toElement() : clone).inject(target, 'after');
  }
});
/*
---
 
script: Append.js
 
description: Append some content to widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Append

...
*/

LSD.Action.Append = LSD.Action.build({
  enable: function(target, content) {
    var widget = LSD.Module.DOM.find(target);
    var fragment = document.createFragment(content);
    var children = Array.prototype.slice.call(fragment.childNodes, 0);
    document.id(target).appendChild(fragment);
    widget.fireEvent('DOMNodeInserted', children);
  }
});
/*
---

name: Event

description: Contains the Event Class, to make the event object cross-browser.

license: MIT-style license.

requires: [Window, Document, Array, Function, String, Object]

provides: Event

...
*/

var Event = new Type('Event', function(event, win){
	if (!win) win = window;
	var doc = win.document;
	event = event || win.event;
	if (event.$extended) return event;
	this.$extended = true;
	var type = event.type,
		target = event.target || event.srcElement,
		page = {},
		client = {},
		related = null,
		rightClick, wheel, code, key;
	while (target && target.nodeType == 3) target = target.parentNode;

	if (type.indexOf('key') != -1){
		code = event.which || event.keyCode;
		key = Object.keyOf(Event.Keys, code);
		if (type == 'keydown'){
			var fKey = code - 111;
			if (fKey > 0 && fKey < 13) key = 'f' + fKey;
		}
		if (!key) key = String.fromCharCode(code).toLowerCase();
	} else if ((/click|mouse|menu/i).test(type)){
		doc = (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
		page = {
			x: (event.pageX != null) ? event.pageX : event.clientX + doc.scrollLeft,
			y: (event.pageY != null) ? event.pageY : event.clientY + doc.scrollTop
		};
		client = {
			x: (event.pageX != null) ? event.pageX - win.pageXOffset : event.clientX,
			y: (event.pageY != null) ? event.pageY - win.pageYOffset : event.clientY
		};
		if ((/DOMMouseScroll|mousewheel/).test(type)){
			wheel = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;
		}
		rightClick = (event.which == 3) || (event.button == 2);
		if ((/over|out/).test(type)){
			related = event.relatedTarget || event[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
			var testRelated = function(){
				while (related && related.nodeType == 3) related = related.parentNode;
				return true;
			};
			var hasRelated = (Browser.firefox2) ? testRelated.attempt() : testRelated();
			related = (hasRelated) ? related : null;
		}
	} else if ((/gesture|touch/i).test(type)){
		this.rotation = event.rotation;
		this.scale = event.scale;
		this.targetTouches = event.targetTouches;
		this.changedTouches = event.changedTouches;
		var touches = this.touches = event.touches;
		if (touches && touches[0]){
			var touch = touches[0];
			page = {x: touch.pageX, y: touch.pageY};
			client = {x: touch.clientX, y: touch.clientY};
		}
	}

	return Object.append(this, {
		event: event,
		type: type,

		page: page,
		client: client,
		rightClick: rightClick,

		wheel: wheel,

		relatedTarget: document.id(related),
		target: document.id(target),

		code: code,
		key: key,

		shift: event.shiftKey,
		control: event.ctrlKey,
		alt: event.altKey,
		meta: event.metaKey
	});
});

Event.Keys = {
	'enter': 13,
	'up': 38,
	'down': 40,
	'left': 37,
	'right': 39,
	'esc': 27,
	'space': 32,
	'backspace': 8,
	'tab': 9,
	'delete': 46
};

//<1.2compat>

Event.Keys = new Hash(Event.Keys);

//</1.2compat>

Event.implement({

	stop: function(){
		return this.stopPropagation().preventDefault();
	},

	stopPropagation: function(){
		if (this.event.stopPropagation) this.event.stopPropagation();
		else this.event.cancelBubble = true;
		return this;
	},

	preventDefault: function(){
		if (this.event.preventDefault) this.event.preventDefault();
		else this.event.returnValue = false;
		return this;
	}

});

/*
---

script: Object.Extras.js

name: Object.Extras

description: Extra Object generics, like getFromPath which allows a path notation to child elements.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Object
  - /MooTools.More

provides: [Object.Extras]

...
*/

(function(){

var defined = function(value){
	return value != null;
};

var hasOwnProperty = Object.prototype.hasOwnProperty;

Object.extend({

	getFromPath: function(source, parts){
		if (typeof parts == 'string') parts = parts.split('.');
		for (var i = 0, l = parts.length; i < l; i++){
			if (hasOwnProperty.call(source, parts[i])) source = source[parts[i]];
			else return null;
		}
		return source;
	},

	cleanValues: function(object, method){
		method = method || defined;
		for (var key in object) if (!method(object[key])){
			delete object[key];
		}
		return object;
	},

	erase: function(object, key){
		if (hasOwnProperty.call(object, key)) delete object[key];
		return object;
	},

	run: function(object){
		var args = Array.slice(arguments, 1);
		for (var key in object) if (object[key].apply){
			object[key].apply(object, args);
		}
		return object;
	}

});

})();

/*
---
 
script: Type.js
 
description: A base class for all class pools
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
  - More/Object.Extras
  
provides:
  - LSD.Type
  - LSD.Module
  - LSD.Trait
  - LSD.Mixin
  - LSD.Element
  
...
*/

LSD.Type = function(name, namespace) {
  this.name = name;
  this.count = 0;
  this.namespace = namespace || 'LSD';
  var holder = Object.getFromPath(window, this.namespace);
  if (this.storage = holder[name]) {
    for (var key in this) this.storage[key] = (this[key].call) ? this[key].bind(this) : this[key];
  }
  else this.storage = (holder[name] = this);
  this.pool = [this.storage];
  this.queries = {};
};

LSD.Type.prototype = {
  each: function(callback, bind) {
    for (var name in this.storage) {
      var value = this.storage[name];
      if (value && value.$family && value.$family() == 'class') callback.call(bind || this, value, name)
    }
  },
  find: function(name) {
    if (!this.queries) this.queries = {};
    else if (this.queries[name] != null) return this.queries[name];
    name = LSD.toClassName(name);
    for (var i = 0, storage; storage = this.pool[i++];) {
      var result = Object.getFromPath(storage, name);
      if (result) return (this.queries[name] = result);
    }
    return (this.queries[name] = false);
  },
  create: function(name, a, b, c, d) {
    var widget = this.find(name);
    if (!widget) throw 'Class named LSD.' + LSD.toClassName(this.name) + '.' + LSD.toClassName(name) + ' was not found';
    this.count++;
    return new widget(a, b, c, d);
  }
}
// must-have stuff for all widgets 
new LSD.Type('Module');
// some widgets may use those
new LSD.Type('Trait');
// these may be applied in runtime
new LSD.Type('Mixin');
// these may be applied in runtime
new LSD.Type('Element');
/*
---
 
script: Shape.js
 
description: Draw a widget with any SVG path you want
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD.Trait
  - ART/ART.Shape
  
provides: 
  - LSD.Module.Shape
 
...
*/

LSD.Module.Shape = new Class({
  options: {
    shape: 'rectangle'
  },
  
  initializers: {
    shape: function() {
      return {
        events: {
          shaped: {
            'render': function() {
              if (this.setSize()) this.resized = true;
            },
            'update': function() {
              delete this.resized;
            }
          }
        }
      }
    }
  },
  
  getShape: Macro.getter('shape', function(name) {
    return this.setShape(name);
  }),
  
  setShape: function(name) {    
    if (!name) name = this.options.shape;
    var shape = new ART.Shape[name.camelCase().capitalize()];
    shape.name = name;
    shape.widget = this;
    if (!this.shape) this.addEvents(this.options.events.shaped);
    this.shape = shape;
    return shape;
  },
  
  getCanvas: Macro.getter('canvas', function() {
    var art = new ART;
    art.toElement().inject(this.toElement(), 'top');
    return art;
  })
  
});
/*
---
 
script: Target.js
 
description: Functions to fetch and parse targets
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides: 
  - LSD.Module.Target

...
*/

!function() {
  var cache = {};
  LSD.Module.Target = new Class({
    options: {
      chain: {
        target: function() {
          if (!this.attributes.target) return;
          var action;
          return this.parseTargetSelector(this.attributes.target).map(function(chain) {
            if (!chain.action) chain.action = this.getTargetAction();
            if (!chain.action) return;
            if (chain.selector) chain.target = function() {
              return this.getTarget(chain.selector);
            }
            return chain;
          }.bind(this));
        }
      }
    },
    
    getTarget: function(selector) {
      if (!selector && !(selector = this.attributes.target)) return false;
      var results = this.getElements(selector)
      return results.length > 0 && results.map(function(result) {
        if (result.localName) {
          var widget = Element.retrieve(result, 'widget');
          if (widget && widget.element == result) return widget
        }
        return result;
      });
    },
  
    parseTargetSelector: function(selector) {
      if (cache[selector]) return cache[selector]
      return cache[selector] = Parser.exec.apply(Parser, arguments)
    },

    getTargetAction: function() {
      return this.attributes.interaction || this.captureEvent('getTargetAction', arguments);
    }
  });
  
  
  var Parser = LSD.Module.Target.Parser = {
    build: function(expression, start, end) {      
      var last = expression[end - start - 1];
      if (!last.classes && !last.attributes && last.tag == '*' && !last.id && last.pseudos[0].type == 'class') {
        var actions = last.pseudos
        end--;
      };
      var built = (start < end) ? {selector: Parser.slice(expression, start, end)} : {}
      if (actions) return actions.map(function(pseudo, i) {
          var object = Object.append({action: pseudo.key}, built);
          if (pseudo.value) object.arguments = pseudo.value;
          return object;
      }); else return built;
    },
    
    slice: function(expressions, start, end) {
      return {
        Slick: true,
        expressions: [expressions.slice(start, end)]
      };
    },
    
    exec: function(selector) {
      var parsed = selector.Slick ? selector : Slick.parse(selector), expressions = [];
      for (var i = 0, expression; expression = parsed.expressions[i]; i++) {
        var started = 0;
        for (var j = 0, k = expression.length - 1, selector; selector = expression[j]; j++) {
          var joiner = Joiners[selector.combinator];
          if (joiner || j == k) {
            var exp = Parser.build(expression, started, (joiner ? j : j + 1));
            expressions.push[exp.push ? 'apply' : 'call'](expressions, exp);
          }
        }
      }
      return expressions;
    }
  };
  
  var Joiners = Parser.Joiners = {
    '&': function(a, b) {
      return a() && b()
    },
    '|': function(a, b) {
      return a() || b()
    }
  };
}();
/*
---

name: Target.js

description: Monkey patch for Module Target.

license: MIT-style license.

extends: LSD/LSD.Module.Target

...
*/

!function(parseTargetSelector, getTargetAction) {
  LSD.Module.Target.implement({
    parseTargetSelector: function(selector) {
      if (selector == 'lightbox') return [{target: selector}];
      return parseTargetSelector.apply(this, arguments);
    },

    getTargetAction: function() {
      if (this.attributes.target == 'lightbox') return 'dialog';
      return getTargetAction.apply(this, arguments);
    }
  });
}(LSD.Module.Target.prototype.parseTargetSelector, LSD.Module.Target.prototype.getTargetAction);
/*
---
 
script: Actions.js
 
description: Assign functions asyncronously to any widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Module
  - LSD.Action

provides: 
  - LSD.Module.Actions
 
...
*/

LSD.Module.Actions = new Class({
  options: {
    actions: {}
  },
  
  initializers: {
    actions: function() {
      this.actions = {}
    }
  },
  
  addAction: function() {
    this.getAction.apply(this, arguments).attach(this);
  },
  
  removeAction: function() {
    this.getAction.apply(this, arguments).detach(this);
  },
  
  getAction: function(name, action) {
    if (this.actions[name]) return this.actions[name];
    if (!action) {
      action = {name: name};
      var actions = this.options.actions;
      if (actions && actions[name]) Object.append(action, actions[name]);
    }
    return (this.actions[name] = new (LSD.Action[LSD.capitalize(name)] || LSD.Action)(action, name))
  },
  
  execute: function(command, args) {
    if (command.call && (!(command = command.apply(this, args))));
    else if (command.indexOf) command = {action: command}
    if (command.arguments) {
      var cargs = command.arguments.call ? command.arguments.call(this) : command.arguments;
      args = [].concat(cargs || [], args || []);
    }
    var action = this.getAction(command.action);
    var targets = command.target;
    if (targets && targets.call && (!(targets = targets.call(this)) || (targets.length === 0))) return true;
    var state = command.state;
    var promise, self = this;
    var perform = function(target) {
      var method = (state == null) ? 'perform' : ((state.call ? state(target, targets) : state) ? 'commit' : 'revert');
      var result = action[method](target, target.$states && target.$states[action.name], args);
      if (result && result.callChain && (command.promise !== false)) {
        if (!promise) promise = [];
        promise.push(result);
        result.chain(function() {
          promise.erase(result);
          if (promise.length == 0) self.callChain.apply(self, arguments);  
        });
      } else if (result !== false) return;
      return false;
    };
    var probe = targets ? (targets.map ? targets[0] : targets) : this;
    if (probe.nodeType) action.document =  LSD.Module.DOM.findDocument(probe);
    action.caller = this;
    var ret = (targets) ? (targets.map ? targets.map(perform) : perform(targets)) : perform(this);
    delete action.caller, delete action.document;
    return (ret ? ret[0] : ret) !== false;
  },
  
  mixin: function(mixin, light) {
    if (typeof mixin == 'string') mixin = LSD.Mixin[LSD.capitalize(mixin)];
    var options = mixin.prototype.options;
    Class.mixin(this, mixin, light);
    if (options) {
      Object.merge(this.options, options); //merge!
      this.setOptions(options);
    }
    var initializers = mixin.prototype.initializers;
    if (initializers) for (var name in initializers) initializers[name].call(this);
  },

  unmix: function(mixin, light) {
    if (typeof mixin == 'string') mixin = LSD.Mixin[LSD.capitalize(mixin)];
    this.unsetOptions(mixin.prototype.options);
    Class.unmix(this, mixin, light);
  }
});

LSD.Module.Actions.attach = function(doc) {
  LSD.Mixin.each(function(mixin, name) {
    var selector = mixin.prototype.behaviour;
    if (!selector) return;
    var attached = {};
    var watcher = function (widget, state) {
      if (state) {
        if (attached[widget.lsd]) return;
        else attached[widget.lsd] = true;
        widget.mixin(mixin, true);
      } else if (attached[widget.lsd]) {
        delete attached[widget.lsd];
        widget.unmix(mixin, true);
      }
    };
    selector.split(/\s*,\s*/).each(function(bit) {
      doc.watch(bit, watcher)
    })
  });
};

LSD.Options.actions = {
  add: 'addAction',
  remove: 'removeAction',
  iterate: true
};
/*
---
 
script: Chain.js
 
description: A dynamic state machine with a trigger
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Module.Actions

provides: 
  - LSD.Module.Chain
 
...
*/

LSD.Module.Chain = new Class({
  initializers: {
    chain: function() {
      this.chains = [];
      this.chainPhase = -1;
    }
  },
  
  addChain: function(name, chain) {
    if (!chain.name) chain.name = name;
    this.chains.push(chain);
  },
  
  removeChain: function(name, chain) {
    this.chains.erase(chain);
  },
  
  getActionChain: function() {
    var actions = [];
    for (var i = 0, chain; chain = this.chains[i++];) {
      var action = (chain.indexOf ? this[chain] : chain).apply(this, arguments);
      if (action) actions.push[action.push ? 'apply' : 'call'](actions, action);
    }
    return actions.sort(function(a, b) {
      return (b.priority || 0) - (a.priority || 0);
    });
  },
  
  callChain: function() {
    return this.eachChainAction(function(action, i) {
      return true;
    }, Array.prototype.slice.call(arguments, 0), this.chainPhase).actions
  },
  
  callOptionalChain: function() {
    return this.eachChainAction(function(action, i, priority) {
      if (priority > 0) return false;
    }, Array.prototype.slice.call(arguments, 0)).actions
  },
  
  eachChainAction: function(callback, args, index) {
    if (index == null) index = -1;
    var chain = this.getActionChain.apply(this, args), action, actions;
    for (var link; link = chain[++index];) {
      action = link.perform ? link : link.action ? this.getAction(link.action) : null;
      if (action) {
        if (callback.call(this, action, index, link.priority || 0) === false) continue;
        var result = this.execute(link, args);
        args = null;
      } else {
        if (link.arguments) args = link.arguments;
        if (link.callback) link.callback.apply(this, args);
      }
      if (!action || result === true) continue;
      if (!actions) actions = [];
      actions.push(action.options.name);
      if (result === false) break;//action is asynchronous, stop chain
    }  
    this.chainPhase = index;
    if (this.chainPhase == chain.length) this.chainPhase = -1;
    return {chain: chain, executed: actions};
  },
  
  clearChain: function() {
    this.chainPhase = -1;
  }
});

LSD.Options.chain = {
  add: 'addChain',
  remove: 'removeChain',
  iterate: true
}
/*
---
 
script: Relations.js
 
description: Define a widget associations
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides: 
  - LSD.Module.Relations

...
*/

LSD.Module.Relations = new Class({
  addRelation: function(name, relation, callback) {
    if (!this.relations) this.relations = {};
    this.relations[name] = relation = Object.append({name: name}, relation.indexOf ? {selector: relation} : relation);
    var origin = relation.origin || this, collection = relation.collection, events;
    var callbacks = relation.callbacks ? origin.bindEvents(relation.callbacks) : {}
    if (!relation.layout) relation.layout = relation.selector || name;
    if (name && relation.multiple) origin[name] = [];
    this.options.layout[name] = relation.layout;
    if (relation.proxy) this.addProxy(name, {
      container: function(object) {
        (relation.proxied || (relation.proxied = [])).push(object)
      },
      condition: relation.proxy
    });
    if (relation.relay) for (var type in relation.relay) {
      (relation.relayed || (relation.relayed = {}))[type] = function(event) {
        for (var widget = Element.get(event.target, 'widget'); widget; widget = widget.parentNode) {
          if (origin[name].indexOf(widget) > -1) {
            this.apply(widget, arguments);
            break;
          }
        }
      }.bind(relation.relay[type])
    }
    if (relation.mutation) this.addMutation(relation.mutation, relation.layout);
    relation.watcher = function(widget, state) {
      if (widget == origin) return;
      if (relation.has) {
        widget.setOption('has', relation.has, !state);
      }
      if (relation.events) {
        if (!events) events = origin.bindEvents(relation.events);
        widget[state ? 'addEvents' : 'removeEvents'](events);
      }
      if (callback) callback.call(origin, widget, state);
      if (!state && callbacks.remove) callbacks.remove.call(origin, widget);
      
      if (relation.multiple) {
        if (state)
          if (callbacks.fill && origin[name].push(widget) == 1) callbacks.fill.call(origin, widget)
        else {
          if (callbacks.empty && !origin[name].erase(widget).length) callbacks.empty.call(origin, widget)
        }
        if (relation.relayed && (origin[name].length == +state)) 
          origin.element[state ? 'addEvents' : 'removeEvents'](relation.relayed);
        origin[name][state ? 'push' : 'erase'](widget);
      } else {
        if (state) origin[name] = widget;
        else delete origin[name];
      }
      
      if (collection) (widget[collection] || (widget[collection] = []))[state ? 'include' : 'erase'](origin);
        
      if (relation.alias) widget[relation.alias] = origin;
      if (relation.proxied) relation.proxied.invoke('call', this, widget)
      if (state && callbacks.add) callbacks.add.call(origin, widget);
      if (relation.states) {
        var states = relation.states, get = states.get, set = states.set, add = states.add;
        var method = state ? 'linkState' : 'unlinkState'
        if (get) for (var from in get) widget[method](origin, from, (get[from] === true) ? from : get[from]);
        if (set) for (var to in set) origin[method](widget, to, (set[to] === true) ? to : set[to]);
        if (add) for (var index in add) widget.addState(index, add[index]);
      }
      if (relation.chain) {
        for (var label in relation.chain) widget[state ? 'addChain' : 'removeChain'](label, relation.chain[label]);
      }
      origin.fireEvent(state ? 'relate' : 'unrelate', [widget, name]);
    };
    var watch = function(widget, state) {
      if (relation.selector) {
        widget.watch(relation.selector, relation.watcher);
      } else if (relation.expectation) {
        var expectation = relation.expectation;
        if (expectation.call) expectation = expectation.call(origin);
        if (expectation) widget.expect(expectation, relation.watcher)
      } else {
        relation.watcher.apply(this, arguments)
      }
    }
    var through = relation.through;
    if (through) {
      var from = relation.from || name;
      if (!relation.updaters) relation.updaters = {
        relate: function(object, type) {
          if (type == from) watch(object, true);
        },
        unrelate: function(object, type) {
          if (type == from) watch(object, false);
        }
      }
      if (!relation.relators) relation.relators = {
        relate: function(object, type) {
          if (type != through) return;
          object.addEvents(relation.updaters);
          if (object[type]) object[type].each(function(widget) {
            watch(widget, true)
          });
        },
        unrelate: function(object, type) {
          if (type != through) return
          object.removeEvents(relation.updaters);
          object[type].each(function(widget) {
            watch(widget, false)
          });
        }
      };
      this.addEvents(relation.relators);
    } else {
      var target = relation.target || this;
      if (target.call) target = target.call(this);
      else if (target.indexOf) target = LSD.Module.Events.Targets[target];
      if (target) {
        if (!target.addEvent && !(target.call && (target = target.call(this)))) {
          if (target.events && !events) Object.each(target.events, function(value, event) {
            this.addEvent(event, function(object) {
              watch(object, value);
            });
          }, this);
        } else {
          watch(target, true);
        }
      }
    }
  },
  
  removeRelation: function(relation) {
    
  }
});

LSD.Options.relations = {
  add: 'addRelation',
  remove: 'removeRelation',
  iterate: true
};

LSD.Options.has = Object.append({
  process: function(has) {
    var one = has.one, many = has.many, relations = {};
    if (one) for (var name in one) relations[name] = one[name];
    if (many) for (var name in many) relations[name] = Object.append(many[name], {multiple: true});
    return relations;
  }
}, LSD.Options.relations);

/*
---
 
script: Element.js
 
description: Attach and detach a widget to/from element
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides: 
  - LSD.Module.Element
 
...
*/

LSD.Module.Element = new Class({
  options: {
    key: 'node',
    reusable: true,
    inline: null
  },
  
  initializers: {
    element: function() {
      LSD.uid(this);
      return {
        events: {
          'initialize': function(options, element) {
            if (element) this.attach(element);
          },
          'build': 'attach',
          'destroy': 'detach'
        }
      }
    }
  },
  
  /*
    Attaches widget to a DOM element. If a widget was
    attached to some other element, it deattaches that first
  */
  
  attach: function(element) {
    if (element) {
      if (this.element) {
        if (this.built && this.element != element) this[this.options.reusable ? 'detach' : 'destroy']();
      } else this.element = document.id(element);
    }
    if (!this.built) this.build();
    if (this.options.key) this.element.store(this.options.key, this).fireEvent('attach', this);
    return this.element;
  },

  detach: function(element) {
    if (this.options.key) this.element.eliminate(this.options.key, this).fireEvent('detach', this)
    delete this.element;
  },
  
  toElement: function(){
    if (!this.built && this.build) this.build();
    return this.element;
  },
  
  build: function() {
    var options = this.options, attrs = Object.append({element: this.element}, options.element);
    if (!attrs.tag)
      attrs.tag = ((this.options.inline == null) && options.tag) || (options.inline ? 'span' : 'div'); 
    this.fireEvent('beforeBuild', attrs);
    var stop = (attrs.convert === false), tag = attrs.tag;
    delete attrs.convert, delete attrs.tag, delete attrs.element;
    if (!this.element || stop) this.element = new Element(tag, attrs);
    else var element = this.element.set(attrs);
    var classes = new FastArray;
    if (options.tag != tag) classes.push('lsd', options.tag || this.tagName);
    classes.concat(this.classes);
    if (Object.getLength(classes)) this.element.className = classes.join(' ');
    if (this.attributes) 
      for (var name in this.attributes) 
        if (name != 'width' && name != 'height') {
          var value = this.attributes[name];
          if (!element || element[name] != value) this.element.setAttribute(name, value);
        }

    if (this.style) for (var property in this.style.element) this.element.setStyle(property, this.style.element[property]);
    return this.element;
  },
  
  destroy: function() {
    this.fireEvent('beforeDestroy');
    this.element.destroy();
    return this;
  },
  
  $family: Function.from('object')
});
/*
---
 
script: Shortcuts.js
 
description: Add command key listeners to the widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Ext/Shortcuts
  - LSD.Module
  
provides: 
  - LSD.Module.Shortcuts

...
*/
LSD.Module.Shortcuts = new Class({
  Implements: Shortcuts,
  
  initializers: {
    shortcuts: function() {
      return {
        events: {
          shortcuts: {
            focus: 'enableShortcuts',
            blur: 'disableShortcuts'
          }
        }
      }
    }
  },
  
  addShortcut: function() {
    LSD.Module.Events.setEventsByRegister.call(this, 'shortcuts', true);
    return Shortcuts.prototype.addShortcut.apply(this, arguments);
  },
  
  removeShortcut: function() {
    LSD.Module.Events.setEventsByRegister.call(this, 'shortcuts', false);
    return Shortcuts.prototype.removeShortcut.apply(this, arguments);
  }
});

LSD.Options.shortcuts = {
  add: 'addShortcut',
  remove: 'removeShortcut',
  process: 'bindEvents',
  iterate: true
};
/*
---
 
script: Dimensions.js
 
description: Get and set dimensions of widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides: 
  - LSD.Module.Dimensions
 
...
*/


LSD.Module.Dimensions = new Class({
  initializers: {
    dimensions: function() {
      this.size = {}
    }
  },
  
  setSize: function(size) {
    if (this.size) var old = Object.append({}, this.size)
    if (!size || !(size.height || size.width)) size = {height: this.getStyle('height'), width: this.getStyle('width')}
    if (!(this.setHeight(size.height, true) + this.setWidth(size.width, true))) return false;
    this.fireEvent('resize', [this.size, old]);
    var element = this.element, padding = this.offset.padding;
    if (size.height && this.style.expressed.height) element.style.height = size.height - padding.top - padding.bottom + 'px'
    if (size.width && this.style.expressed.width) element.style.width = size.width - padding.left - padding.right + 'px';
    return true;
  },
  
  setHeight: function(value, light) {
    value = Math.min(this.style.current.maxHeight || 1500, Math.max(this.style.current.minHeight || 0, value));
    if (this.size.height == value) return false;
    this.size.height = value;
    if (!light) this.setStyle('height', value);
    return value;
  },
    
  setWidth: function(value, light) {
    value = Math.min(this.style.current.maxWidth || 3500, Math.max(this.style.current.minWidth || 0, value));
    if (this.size.width == value) return false;
    this.size.width = value;
    if (!light) this.setStyle('width', value);
    return value;
  },
  
  getClientHeight: function() {
    var style = this.style.current, height = style.height, offset = this.offset, padding = offset.padding;
    if (!height || (height == "auto")) {
      height = this.element.clientHeight;
      var inner = offset.inner || padding;
      if (height > 0 && inner) height -= inner.top + inner.bottom;
    }
    if (height != 'auto' && padding) height += padding.top + padding.bottom;
    return height;
  },
  
  getClientWidth: function() {
    var style = this.style.current, offset = this.offset, padding = offset.padding, width = style.width;
    if (typeof width != 'number') { //auto, inherit, undefined
      var inside = offset.inside, outside = offset.outside, shape = offset.shape;
      width = this.element.clientWidth;
      if (width > 0) {
        if (shape) width -= shape.left + shape.right;
        if (inside) width -= inside.left + inside.right;
        if (outside) width -= outside.left + outside.right;
      }
    }
    if (style.display != 'block' && padding && inside) width += padding.left + padding.right;
    return width;
  },
  
  getOffsetHeight: function(height) {
    var style = this.style.current, inside = this.offset.inside, bottom = style.borderBottomWidth, top = style.borderTopWidth;
    if (!height) height =  this.getClientHeight();
    if (inside)  height += inside.top + inside.bottom;
    if (top)     height += top;
    if (bottom)  height += bottom;
    return height;
  },
  
  getOffsetWidth: function(width) {
    var style = this.style.current, inside = this.offset.inside, left = style.borderLeftWidth, right = style.borderRightWidth;
    if (!width) width =  this.getClientWidth();
    if (inside) width += inside.left + inside.right;
    if (left)   width += left;
    if (right)  width += right
    return width;
  },
  
  getLayoutHeight: function(height) {
    height = this.getOffsetHeight(height);
    if (this.offset.margin)  height += this.offset.margin.top + this.offset.margin.bottom;
    if (this.offset.outside) height += this.offset.outside.top + this.offset.outside.bottom;
    return height;
  },

  getLayoutWidth: function(width) {
    var width = this.getOffsetWidth(width), offset = this.offset, margin = offset.margin, outside = offset.outside
    if (margin)  width += margin.right + margin.left;
    if (outside) width += outside.right + outside.left;
    return width;
  }
  
});
/*
---
 
script: States.js
 
description: Define class states and methods metaprogrammatically
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Ext/States
  - LSD.Module
  
provides: 
  - LSD.Module.States

...
*/

LSD.Module.States = new Class({
  Implements: States,
  
  onStateChange: function(state, value, args) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.slice(1, 2); //state + args
    this[value ? 'setState' : 'unsetState'][args && ("length" in args) ? 'apply' : 'call'](this, args);
    this.fireEvent('stateChange', [state, args]);
    return true;
  }
});

LSD.Options.states = {
  add: 'addState',
  remove: 'removeState',
  iterate: true
};
/*
---
 
script: Options.js
 
description: A module that sets and unsets various options stuff
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  
provides:
  - LSD.Module.Options

...
*/

LSD.Module.Options = new Class({
  Implements: [Options],
  
  setOptions: function(options) {
    for (var name in options) this.setOption(name, options[name]);
    return this;
  },
  
  setOption: function(name, value, unset) {
    setter = LSD.Options[name];
    if (!setter) return;
    if (setter.process) {
      value = (setter.process.charAt ? this[setter.process] : setter.process).call(this, value);
    }
    if (setter.events) LSD.Module.Events.setEventsByRegister.call(this, name, !unset, setter.events);
    var mode = unset ? 'remove' : 'add', method = setter[mode];
    if (method.charAt) method = this[method];
    if (setter.iterate) {
      if (value.each) for (var i = 0, j = value.length; i < j; i++) method.call(this, value[i]);
      else for (var i in value) method.call(this, i, value[i])
    } else method.call(this, value);
    return this;
  },
  
  unsetOptions: function(options) {
    for (var name in options) this.setOption(name, options[name], true);
    return this;
  }
});

LSD.Module.Options.initialize = function(element, options) {
  /* 
    Rearrange arguments if they are in the wrong order
  */
  if ((element && !element.tagName) || (options && options.tagName)) {
    var el = options;
    options = element, element = el;
  }
  /*
    Merge given options object into this.options
  */
  options = options ? Object.merge(this.options, options) : this.options;
  var initialized = [];
  /*
    Run module initializers and keep return values
  */
  for (var name in this.initializers) {
    var initializer = this.initializers[name];
    if (initializer) {
      var result = initializer.call(this, options, element);
      if (result) initialized.push(result);
    }
  }
  /*
    Set options returned from initializers
  */
  for (var i = 0, value; value = initialized[i++];) this.setOptions(value);
  /*
    Call parent class initializer (if set)
  */
  if (Class.hasParent(this)) this.parent(element, options);
  /* 
    Run callbacks for all the options set
  */
  this.setOptions(options);
  /*
    Attach to a given element
  */
  this.fireEvent('initialize', [options, element])
};
/*
---
 
script: Value.js
 
description: Add your widget have a real form value.
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
 
provides: 
  - LSD.Mixin.Value
 
...
*/

LSD.Mixin.Value = new Class({
  behaviour: ':read-write, :valued',
  
  options: {
    events: {
      _value: {
        dominject: function() {
        },
        change: 'callChain'
      }
    },
    multiple: false,
    actions: {
      value: {
        enable: function() {
          if (this.attributes.multiple) this.values = []
          if (this.getValue() != null) return;
          var raw = this.getRawValue();
          if (raw != null) this.setValue(raw);
        },
        disable: function() {
          
        }
      }
    }
  },
  
  setValue: function(item, unset) {
    if (item == null || (item.event && item.type)) item = this.getRawValue();
    var value = this.processValue(item), result = false;
    if (this.isValueDifferent(value) ^ (!!unset)) {
      result = this.writeValue(value, unset);
      this.onChange(value, this.getPreviousValue());
    }
    return result
  },
  
  isValueDifferent: function(value) {
    if (this.attributes.multiple) {
      return this.values.indexOf == -1
    } else {
      return this.value != value;
    }
  },
  
  getValueInput: function() {
    if (!this.attributes.multiple && this.attributes.type != 'file' 
      && LSD.toLowerCase(this.element.tagName) == 'input') return this.element;

    var name = this.attributes.name;
    if (this.attributes.miltiple) name += '[]';
    return new Element('input[type=hidden]', {name: name}).inject(this.element);
  },
  
  writeValue: function(value, unset) {
    if (this.attributes.multiple) {
      if (unset) {
        var index = this.values.indexOf(value);
        if (index > -1) {
          this.values.splice(index, 1);
          this.valueInputs.splice(index, 1)[0].dispose();
        }
      } else {  
        this.previousValue = this.values.clone();
        this.values.push(value);
        (this.valueInputs || (this.valueInputs = [])).push(this.getValueInput());
        this.applyValue(this.values);
      }
    } else {
      var input = this.valueInput || (this.valueInput = this.getValueInput());
      this.previousValue = this.value;
      if (unset) delete this.value;
      else this.value = value;
      input.set('value', unset ? '' : value);
      this.applyValue(this.value);
    }
  },
  
  getPreviousValue: function() {
    return this.previousValue
  },
  
  applyValue: function(value) {
    return this;
  },
  
  getRawValue: function() {
    return this.attributes.value || LSD.Module.DOM.getID(this) || this.innerText;
  },

  getValue: function() {
    if (this.attributes.multiple) {
      return this.values.map(this.formatValue, this)
    } else {
      return this.formatValue(this.value);
    }
  },

  formatValue: function(value) {
    return value;
  },
  
  processValue: function(value) {
    return value;
  },
  
  onChange: function() {
    this.fireEvent('change', arguments)
    return true;
  }
});
/*
---
 
script: Placeholder.js
 
description: Placeholder for form fileds.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin

 
provides:   
  - LSD.Mixin.Placeholder
 
...
*/


LSD.Mixin.Placeholder = new Class({
  behaviour: '[placeholder]',
  
  options: {
    actions: {
      placeholder: {
        enable: function(){
          this.element.set('autocomplete', 'off');
          this.onPlacehold();
        }
      }
    },
    events: {
      enabled: {
        element: {
          'focus': 'onUnplacehold',
          'blur': 'onPlacehold',
          'keypress': 'onUnplacehold'
        }
      }
    },
    states: {
      placeheld: {
        enabler: 'placehold',
        disabler: 'unplacehold'
      }
    }
  },
  
  getPlaceholder: Macro.getter('placeholder', function(){
    return this.attributes.placeholder;
  }),
  
  onUnplacehold: function(){
    if(this.placeheld){
      this.applyValue('');
      this.unplacehold();
      return true;
    };
  },
  
  onPlacehold: function(){
    var value = this.getRawValue();
    if(!value || value.match(/^\s*$/) || value == this.getPlaceholder()){
      this.applyValue(this.getPlaceholder());
      this.placehold();
      return true;
    };
  }
  
});
/*
---
 
script: Dialog.js
 
description: Work with dialog
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
 
provides: 
  - LSD.Mixin.Dialog
 
...
*/

LSD.Mixin.Dialog = new Class({
  behaviour: '[dialog]',
  
  options: {
    layout: {
      dialog: "body[type=dialog]"
    },
    chain: {
      dialog: function() {
        var target = this.getDialogTarget();
        if (target) return {action: 'dialog', target: target, priority: 50};
      }
    },
    events: {
      dialogs: {}
    }
  },
  
  getDialog: function(name) {
    if (!this.dialogs) this.dialogs = {};
    if (!this.dialogs[name]) {
      this.dialogs[name] = this.options.layout[name] ? this.buildDialog.apply(this, arguments) : LSD.Element.create('body-dialog-' + name);
    }
    return this.dialogs[name];
  },
  
  buildDialog: function(name) {
    var layout = {}
    layout[this.options.layout.dialog] = this.options.layout[name];
    var dialog = this.buildLayout(layout)[0];
    var events = this.options.events.dialogs;
    if (events[name]) dialog.addEvents(events[name]);
    return dialog;
  },
  
  getDialogTarget: function() {
    return this.attributes.dialog && this.getTarget(this.attributes.dialog);
  }
})
/*
---
 
script: Fieldset.js
 
description: Wrapper around set of form fields
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
 
provides: 
  - LSD.Trait.Fieldset
 
...
*/

LSD.Trait.Fieldset = new Class({
  options: {
    events :{
      request: {
        request: 'validateFields',
        badRequest: 'parseFieldErrors'
      },
      _fieldset: {
        mutateLayout: function(query) {
          var element = query.element, name = element.name, id = element.id, mutation;
          var widget = Element.retrieve(element, 'widget');
          if (!widget) return;
          if (name && this.names[name]) {
            var bumped = LSD.Trait.Fieldset.bumpName(name);
            if (bumped) (mutation || (mutation = {attributes: {}})).attributes.name = bumped;
          }
          // bump id index
          if (id) {
            bumped = LSD.Trait.Fieldset.bumpId(id);
            if (bumped != id) (mutation || (mutation = {attributes: {}})).attributes.id = bumped;
          }
          // bump name index
          if (LSD.toLowerCase(element.tagName) == 'label') {
            var four = element.htmlFor
            if (four) {
              bumped = LSD.Trait.Fieldset.bumpId(four);
              if (bumped != four) (mutation || (mutation = {attributes: {}})).attributes['for'] = bumped;
            }
          }
          if (query.mutation) Object.append(query.mutation, mutation);
          else query.mutation = mutation;
        }
      }
    },
    has: {
      many: {
        elements: {
          selector: ':read-write',
          callbacks: {
            'add': 'addField',
            'remove': 'removeField'
          }
        }
      }
    }
  },
  
  initialize: function() {
    this.names = {};
    this.params = {};
    this.parent.apply(this, arguments)
  },
  
  checkValidity: function() {
    var valid = true;
    for (var i = 0, element; element = this.elements[i++];) if (!element.checkValidity()) valid = false;
    return valid;
  },
  
  getData: function() {
    var data = {}
    for (var name in this.names) {
      var memo = this.names[name];
      if (memo.push) {
        for (var i = 0, radio; radio = memo[i++];) if (radio.checked) data[name] = radio.getValue(); break;
      } else if (memo.options.command.type != 'checkbox' || memo.checked) data[name] = memo.getValue();
    }
    return data;
  },

  getRequestData: function() {
    return this.getData();
  },
  
  reset: function() {
    
  },
  
  addFieldErrors: function(errors) {
    for (var name in errors) {
      var field = this.names[name];
      console.log(name, field, errors[name])
      if (!field) continue;
      field.invalidate(errors[name]);
      this.invalid = true;
    }
  },

  parseFieldErrors: function(response) {
    var result = {}, errors = response.errors;
    if (errors) { //rootless response ({errors: {}), old rails
      for (var i = 0, error; error = errors[i++];)
        result[LSD.Trait.Fieldset.getName(this.getModelName(error[0]), error[0])] = error[1];
    } else { //rooted response (publication: {errors: {}}), new rails
      var regex = LSD.Trait.Fieldset.rPrefixAppender;
      for (var model in response) {
        var value = response[model], errors = value.errors;
        if (!errors) continue;
        for (var i = 0, error; error = errors[i++];)
          result[LSD.Trait.Fieldset.getName(model, error[0])] = error[1];
      }
    }
    if (Object.getLength(result) > 0) this.addFieldErrors(result);
  },
  
  addField: function(widget) {
    var name = widget.attributes.name, radio = (widget.options.command.type == 'radio');
    if (!name) return;
    if (radio) {
      if (!this.names[name]) this.names[name] = [];
      this.names[name].push(widget);
    } else this.names[name] = widget;
    for (var regex = LSD.Trait.Fieldset.rNameParser, object = this.params, match, bit;;) {
      match = regex.exec(name)
      if (bit != null) {
        if (!match) {
          if (!object[bit] && radio) object[bit] = [];
          if (object[bit] && object[bit].push) object[bit].push(widget);
          else object[bit] = widget;
        } else object = object[bit] || (object[bit] = (bit ? {} : []));
      }
      if (!match) break;
      else bit = match[1] ||match[2];
    }
    return object
  },
  
  getParams: function(object) {
    if (!object) object = this.params;
    var result = {};
    for (var name in object) {
      var value = object[name];
      if (value && !value.indexOf) value = value.nodeType ? value.getValue() : this.getParams(value);
      result[name] = value;
    }
    return result;
  },
  
  removeField: function(widget) {
    var name = widget.attributes.name, radio = (widget.options.command.type == 'radio');
    if (!name) return;
    if (radio) this.names[name].erase(widget);
    else delete this.names[name];
    for (var regex = LSD.Trait.Fieldset.rNameParser, object = this.params, match, bit;;) {
      match = regex.exec(name)
      if (bit != null) {
        if (!match) {
          if (radio) object[bit].erase(widget)
          else delete object[bit];
        } else object = object[bit];
      }
      if (!match) break;
      else bit = match[1] ||match[2];
    }
    return object
  },

  invalidateFields: function(errors) {
    this.getFields(errors, function(field, error) {
      field.invalidate(error);
    });
  },
  
  getFieldsByName: function(fields, callback, root) {
    if (fields.call && (callback = fields)) fields = null;
    if (!fields) fields = this.elements;
    if (!callback && fields.indexOf) return root[fields]
    if (fields.map && fields.each && (!callback || !root)) return fields.map(function(field) {
      return this.getFieldsByName(field, callback, root)
    }.bind(this));
  },
  
  validateFields: function(fields) {
    if (!this.invalid) return;
    this.getElements(':read-write:invalid').each(function(field) {
      field.validate(true);
    })
  },

  getModelName: Macro.getter('modelName', function() {
    for (var name in this.params) if (!this.params[name].nodeType) return name;
  })
});
Object.append(LSD.Trait.Fieldset, {
  rNameIndexBumper: /(\[)(\d+?)(\])/,
  rIdIndexBumper: /(_)(\d+?)(_|$)/,
  rNameParser:      /(^[^\[]+)|\[([^\]]*)\]/ig,
  rPrefixAppender:  /^[^\[]+/i,
  getName: function(model, name) {
    return model + name.replace(LSD.Trait.Fieldset.rPrefixAppender, function(match) {return '[' + match + ']'});
  },
  bumpName: function(string) {
    return string.replace(LSD.Trait.Fieldset.rNameIndexBumper, function(m, a, index, b) { 
      return a + (parseInt(index) + 1) + b;
    })
  },
  bumpId: function(string) {
    return string.replace(LSD.Trait.Fieldset.rIdIndexBumper, function(m, a, index, b) { 
      return a + (parseInt(index) + 1) + b;
    })
  }
});
/*
---

script: Locale.js

name: Locale

description: Provides methods for localization.

license: MIT-style license

authors:
  - Aaron Newton
  - Arian Stolwijk

requires:
  - Core/Events
  - /Object.Extras
  - /MooTools.More

provides: [Locale, Lang]

...
*/

(function(){

var current = null,
	locales = {},
	inherits = {};

var getSet = function(set){
	if (instanceOf(set, Locale.Set)) return set;
	else return locales[set];
};

var Locale = this.Locale = {

	define: function(locale, set, key, value){
		var name;
		if (instanceOf(locale, Locale.Set)){
			name = locale.name;
			if (name) locales[name] = locale;
		} else {
			name = locale;
			if (!locales[name]) locales[name] = new Locale.Set(name);
			locale = locales[name];
		}

		if (set) locale.define(set, key, value);

		/*<1.2compat>*/
		if (set == 'cascade') return Locale.inherit(name, key);
		/*</1.2compat>*/

		if (!current) current = locale;

		return locale;
	},

	use: function(locale){
		locale = getSet(locale);

		if (locale){
			current = locale;

			this.fireEvent('change', locale);

			/*<1.2compat>*/
			this.fireEvent('langChange', locale.name);
			/*</1.2compat>*/
		}

		return this;
	},

	getCurrent: function(){
		return current;
	},

	get: function(key, args){
		return (current) ? current.get(key, args) : '';
	},

	inherit: function(locale, inherits, set){
		locale = getSet(locale);

		if (locale) locale.inherit(inherits, set);
		return this;
	},

	list: function(){
		return Object.keys(locales);
	}

};

Object.append(Locale, new Events);

Locale.Set = new Class({

	sets: {},

	inherits: {
		locales: [],
		sets: {}
	},

	initialize: function(name){
		this.name = name || '';
	},

	define: function(set, key, value){
		var defineData = this.sets[set];
		if (!defineData) defineData = {};

		if (key){
			if (typeOf(key) == 'object') defineData = Object.merge(defineData, key);
			else defineData[key] = value;
		}
		this.sets[set] = defineData;

		return this;
	},

	get: function(key, args, _base){
		var value = Object.getFromPath(this.sets, key);
		if (value != null){
			var type = typeOf(value);
			if (type == 'function') value = value.apply(null, Array.from(args));
			else if (type == 'object') value = Object.clone(value);
			return value;
		}

		// get value of inherited locales
		var index = key.indexOf('.'),
			set = index < 0 ? key : key.substr(0, index),
			names = (this.inherits.sets[set] || []).combine(this.inherits.locales).include('en-US');
		if (!_base) _base = [];

		for (var i = 0, l = names.length; i < l; i++){
			if (_base.contains(names[i])) continue;
			_base.include(names[i]);

			var locale = locales[names[i]];
			if (!locale) continue;

			value = locale.get(key, args, _base);
			if (value != null) return value;
		}

		return '';
	},

	inherit: function(names, set){
		names = Array.from(names);

		if (set && !this.inherits.sets[set]) this.inherits.sets[set] = [];

		var l = names.length;
		while (l--) (set ? this.inherits.sets[set] : this.inherits.locales).unshift(names[l]);

		return this;
	}

});

/*<1.2compat>*/
var lang = MooTools.lang = {};

Object.append(lang, Locale, {
	setLanguage: Locale.use,
	getCurrentLanguage: function(){
		var current = Locale.getCurrent();
		return (current) ? current.name : null;
	},
	set: function(){
		Locale.define.apply(this, arguments);
		return this;
	},
	get: function(set, key, args){
		if (key) set += '.' + key;
		return Locale.get(set, args);
	}
});
/*</1.2compat>*/

})();

/*
---

name: Locale.en-US.Date

description: Date messages for US English.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - /Locale

provides: [Locale.en-US.Date]

...
*/

Locale.define('en-US', 'Date', {

	months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	months_abbr: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
	days_abbr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

	// Culture's date order: MM/DD/YYYY
	dateOrder: ['month', 'date', 'year'],
	shortDate: '%m/%d/%Y',
	shortTime: '%I:%M%p',
	AM: 'AM',
	PM: 'PM',
	firstDayOfWeek: 0,

	// Date.Extras
	ordinal: function(dayOfMonth){
		// 1st, 2nd, 3rd, etc.
		return (dayOfMonth > 3 && dayOfMonth < 21) ? 'th' : ['th', 'st', 'nd', 'rd', 'th'][Math.min(dayOfMonth % 10, 4)];
	},

	lessThanMinuteAgo: 'less than a minute ago',
	minuteAgo: 'about a minute ago',
	minutesAgo: '{delta} minutes ago',
	hourAgo: 'about an hour ago',
	hoursAgo: 'about {delta} hours ago',
	dayAgo: '1 day ago',
	daysAgo: '{delta} days ago',
	weekAgo: '1 week ago',
	weeksAgo: '{delta} weeks ago',
	monthAgo: '1 month ago',
	monthsAgo: '{delta} months ago',
	yearAgo: '1 year ago',
	yearsAgo: '{delta} years ago',

	lessThanMinuteUntil: 'less than a minute from now',
	minuteUntil: 'about a minute from now',
	minutesUntil: '{delta} minutes from now',
	hourUntil: 'about an hour from now',
	hoursUntil: 'about {delta} hours from now',
	dayUntil: '1 day from now',
	daysUntil: '{delta} days from now',
	weekUntil: '1 week from now',
	weeksUntil: '{delta} weeks from now',
	monthUntil: '1 month from now',
	monthsUntil: '{delta} months from now',
	yearUntil: '1 year from now',
	yearsUntil: '{delta} years from now'

});

/*
---

script: Date.js

name: Date

description: Extends the Date native object to include methods useful in managing dates.

license: MIT-style license

authors:
  - Aaron Newton
  - Nicholas Barthelemy - https://svn.nbarthelemy.com/date-js/
  - Harald Kirshner - mail [at] digitarald.de; http://digitarald.de
  - Scott Kyle - scott [at] appden.com; http://appden.com

requires:
  - Core/Array
  - Core/String
  - Core/Number
  - MooTools.More
  - Locale
  - Locale.en-US.Date

provides: [Date]

...
*/

(function(){

var Date = this.Date;

var DateMethods = Date.Methods = {
	ms: 'Milliseconds',
	year: 'FullYear',
	min: 'Minutes',
	mo: 'Month',
	sec: 'Seconds',
	hr: 'Hours'
};

['Date', 'Day', 'FullYear', 'Hours', 'Milliseconds', 'Minutes', 'Month', 'Seconds', 'Time', 'TimezoneOffset',
	'Week', 'Timezone', 'GMTOffset', 'DayOfYear', 'LastMonth', 'LastDayOfMonth', 'UTCDate', 'UTCDay', 'UTCFullYear',
	'AMPM', 'Ordinal', 'UTCHours', 'UTCMilliseconds', 'UTCMinutes', 'UTCMonth', 'UTCSeconds', 'UTCMilliseconds'].each(function(method){
	Date.Methods[method.toLowerCase()] = method;
});

var pad = function(n, digits, string){
	if (digits == 1) return n;
	return n < Math.pow(10, digits - 1) ? (string || '0') + pad(n, digits - 1, string) : n;
};

Date.implement({

	set: function(prop, value){
		prop = prop.toLowerCase();
		var method = DateMethods[prop] && 'set' + DateMethods[prop];
		if (method && this[method]) this[method](value);
		return this;
	}.overloadSetter(),

	get: function(prop){
		prop = prop.toLowerCase();
		var method = DateMethods[prop] && 'get' + DateMethods[prop];
		if (method && this[method]) return this[method]();
		return null;
	}.overloadGetter(),

	clone: function(){
		return new Date(this.get('time'));
	},

	increment: function(interval, times){
		interval = interval || 'day';
		times = times != null ? times : 1;

		switch (interval){
			case 'year':
				return this.increment('month', times * 12);
			case 'month':
				var d = this.get('date');
				this.set('date', 1).set('mo', this.get('mo') + times);
				return this.set('date', d.min(this.get('lastdayofmonth')));
			case 'week':
				return this.increment('day', times * 7);
			case 'day':
				return this.set('date', this.get('date') + times);
		}

		if (!Date.units[interval]) throw new Error(interval + ' is not a supported interval');

		return this.set('time', this.get('time') + times * Date.units[interval]());
	},

	decrement: function(interval, times){
		return this.increment(interval, -1 * (times != null ? times : 1));
	},

	isLeapYear: function(){
		return Date.isLeapYear(this.get('year'));
	},

	clearTime: function(){
		return this.set({hr: 0, min: 0, sec: 0, ms: 0});
	},

	diff: function(date, resolution){
		if (typeOf(date) == 'string') date = Date.parse(date);

		return ((date - this) / Date.units[resolution || 'day'](3, 3)).round(); // non-leap year, 30-day month
	},

	getLastDayOfMonth: function(){
		return Date.daysInMonth(this.get('mo'), this.get('year'));
	},

	getDayOfYear: function(){
		return (Date.UTC(this.get('year'), this.get('mo'), this.get('date') + 1)
			- Date.UTC(this.get('year'), 0, 1)) / Date.units.day();
	},

	setDay: function(day, firstDayOfWeek){
		if (firstDayOfWeek == null){
			firstDayOfWeek = Date.getMsg('firstDayOfWeek');
			if (firstDayOfWeek === '') firstDayOfWeek = 1;
		}

		day = (7 + Date.parseDay(day, true) - firstDayOfWeek) % 7;
		var currentDay = (7 + this.get('day') - firstDayOfWeek) % 7;

		return this.increment('day', day - currentDay);
	},

	getWeek: function(firstDayOfWeek){
		if (firstDayOfWeek == null){
			firstDayOfWeek = Date.getMsg('firstDayOfWeek');
			if (firstDayOfWeek === '') firstDayOfWeek = 1;
		}

		var date = this,
			dayOfWeek = (7 + date.get('day') - firstDayOfWeek) % 7,
			dividend = 0,
			firstDayOfYear;

		if (firstDayOfWeek == 1){
			// ISO-8601, week belongs to year that has the most days of the week (i.e. has the thursday of the week)
			var month = date.get('month'),
				startOfWeek = date.get('date') - dayOfWeek;

			if (month == 11 && startOfWeek > 28) return 1; // Week 1 of next year

			if (month == 0 && startOfWeek < -2){
				// Use a date from last year to determine the week
				date = new Date(date).decrement('day', dayOfWeek);
				dayOfWeek = 0;
			}

			firstDayOfYear = new Date(date.get('year'), 0, 1).get('day') || 7;
			if (firstDayOfYear > 4) dividend = -7; // First week of the year is not week 1
		} else {
			// In other cultures the first week of the year is always week 1 and the last week always 53 or 54.
			// Days in the same week can have a different weeknumber if the week spreads across two years.
			firstDayOfYear = new Date(date.get('year'), 0, 1).get('day');
		}

		dividend += date.get('dayofyear');
		dividend += 6 - dayOfWeek; // Add days so we calculate the current date's week as a full week
		dividend += (7 + firstDayOfYear - firstDayOfWeek) % 7; // Make up for first week of the year not being a full week

		return (dividend / 7);
	},

	getOrdinal: function(day){
		return Date.getMsg('ordinal', day || this.get('date'));
	},

	getTimezone: function(){
		return this.toString()
			.replace(/^.*? ([A-Z]{3}).[0-9]{4}.*$/, '$1')
			.replace(/^.*?\(([A-Z])[a-z]+ ([A-Z])[a-z]+ ([A-Z])[a-z]+\)$/, '$1$2$3');
	},

	getGMTOffset: function(){
		var off = this.get('timezoneOffset');
		return ((off > 0) ? '-' : '+') + pad((off.abs() / 60).floor(), 2) + pad(off % 60, 2);
	},

	setAMPM: function(ampm){
		ampm = ampm.toUpperCase();
		var hr = this.get('hr');
		if (hr > 11 && ampm == 'AM') return this.decrement('hour', 12);
		else if (hr < 12 && ampm == 'PM') return this.increment('hour', 12);
		return this;
	},

	getAMPM: function(){
		return (this.get('hr') < 12) ? 'AM' : 'PM';
	},

	parse: function(str){
		this.set('time', Date.parse(str));
		return this;
	},

	isValid: function(date){
		return !isNaN((date || this).valueOf());
	},

	format: function(f){
		if (!this.isValid()) return 'invalid date';
		if (!f) f = '%x %X';

		var formatLower = f.toLowerCase();
		if (formatters[formatLower]) return formatters[formatLower](this); // it's a formatter!
		f = formats[formatLower] || f; // replace short-hand with actual format

		var d = this;
		return f.replace(/%([a-z%])/gi,
			function($0, $1){
				switch ($1){
					case 'a': return Date.getMsg('days_abbr')[d.get('day')];
					case 'A': return Date.getMsg('days')[d.get('day')];
					case 'b': return Date.getMsg('months_abbr')[d.get('month')];
					case 'B': return Date.getMsg('months')[d.get('month')];
					case 'c': return d.format('%a %b %d %H:%M:%S %Y');
					case 'd': return pad(d.get('date'), 2);
					case 'e': return pad(d.get('date'), 2, ' ');
					case 'H': return pad(d.get('hr'), 2);
					case 'I': return pad((d.get('hr') % 12) || 12, 2);
					case 'j': return pad(d.get('dayofyear'), 3);
					case 'k': return pad(d.get('hr'), 2, ' ');
					case 'l': return pad((d.get('hr') % 12) || 12, 2, ' ');
					case 'L': return pad(d.get('ms'), 3);
					case 'm': return pad((d.get('mo') + 1), 2);
					case 'M': return pad(d.get('min'), 2);
					case 'o': return d.get('ordinal');
					case 'p': return Date.getMsg(d.get('ampm'));
					case 's': return Math.round(d / 1000);
					case 'S': return pad(d.get('seconds'), 2);
					case 'T': return d.format('%H:%M:%S');
					case 'U': return pad(d.get('week'), 2);
					case 'w': return d.get('day');
					case 'x': return d.format(Date.getMsg('shortDate'));
					case 'X': return d.format(Date.getMsg('shortTime'));
					case 'y': return d.get('year').toString().substr(2);
					case 'Y': return d.get('year');
					case 'z': return d.get('GMTOffset');
					case 'Z': return d.get('Timezone');
				}
				return $1;
			}
		);
	},

	toISOString: function(){
		return this.format('iso8601');
	}

}).alias({
	toJSON: 'toISOString',
	compare: 'diff',
	strftime: 'format'
});

var formats = {
	db: '%Y-%m-%d %H:%M:%S',
	compact: '%Y%m%dT%H%M%S',
	'short': '%d %b %H:%M',
	'long': '%B %d, %Y %H:%M'
};

// The day and month abbreviations are standardized, so we cannot use simply %a and %b because they will get localized
var rfcDayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	rfcMonthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var formatters = {
	rfc822: function(date){
		return rfcDayAbbr[date.get('day')] + date.format(', %d ') + rfcMonthAbbr[date.get('month')] + date.format(' %Y %H:%M:%S %Z');
	},
	rfc2822: function(date){
		return rfcDayAbbr[date.get('day')] + date.format(', %d ') + rfcMonthAbbr[date.get('month')] + date.format(' %Y %H:%M:%S %z');
	},
	iso8601: function(date){
		return (
			date.getUTCFullYear() + '-' +
			pad(date.getUTCMonth() + 1, 2) + '-' +
			pad(date.getUTCDate(), 2) + 'T' +
			pad(date.getUTCHours(), 2) + ':' +
			pad(date.getUTCMinutes(), 2) + ':' +
			pad(date.getUTCSeconds(), 2) + '.' +
			pad(date.getUTCMilliseconds(), 3) + 'Z'
		);
	}
};


var parsePatterns = [],
	nativeParse = Date.parse;

var parseWord = function(type, word, num){
	var ret = -1,
		translated = Date.getMsg(type + 's');
	switch (typeOf(word)){
		case 'object':
			ret = translated[word.get(type)];
			break;
		case 'number':
			ret = translated[word];
			if (!ret) throw new Error('Invalid ' + type + ' index: ' + word);
			break;
		case 'string':
			var match = translated.filter(function(name){
				return this.test(name);
			}, new RegExp('^' + word, 'i'));
			if (!match.length) throw new Error('Invalid ' + type + ' string');
			if (match.length > 1) throw new Error('Ambiguous ' + type);
			ret = match[0];
	}

	return (num) ? translated.indexOf(ret) : ret;
};

var startCentury = 1900,
	startYear = 70;

Date.extend({

	getMsg: function(key, args){
		return Locale.get('Date.' + key, args);
	},

	units: {
		ms: Function.from(1),
		second: Function.from(1000),
		minute: Function.from(60000),
		hour: Function.from(3600000),
		day: Function.from(86400000),
		week: Function.from(608400000),
		month: function(month, year){
			var d = new Date;
			return Date.daysInMonth(month != null ? month : d.get('mo'), year != null ? year : d.get('year')) * 86400000;
		},
		year: function(year){
			year = year || new Date().get('year');
			return Date.isLeapYear(year) ? 31622400000 : 31536000000;
		}
	},

	daysInMonth: function(month, year){
		return [31, Date.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
	},

	isLeapYear: function(year){
		return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
	},

	parse: function(from){
		var t = typeOf(from);
		if (t == 'number') return new Date(from);
		if (t != 'string') return from;
		from = from.clean();
		if (!from.length) return null;

		var parsed;
		parsePatterns.some(function(pattern){
			var bits = pattern.re.exec(from);
			return (bits) ? (parsed = pattern.handler(bits)) : false;
		});

		if (!(parsed && parsed.isValid())){
			parsed = new Date(nativeParse(from));
			if (!(parsed && parsed.isValid())) parsed = new Date(from.toInt());
		}
		return parsed;
	},

	parseDay: function(day, num){
		return parseWord('day', day, num);
	},

	parseMonth: function(month, num){
		return parseWord('month', month, num);
	},

	parseUTC: function(value){
		var localDate = new Date(value);
		var utcSeconds = Date.UTC(
			localDate.get('year'),
			localDate.get('mo'),
			localDate.get('date'),
			localDate.get('hr'),
			localDate.get('min'),
			localDate.get('sec'),
			localDate.get('ms')
		);
		return new Date(utcSeconds);
	},

	orderIndex: function(unit){
		return Date.getMsg('dateOrder').indexOf(unit) + 1;
	},

	defineFormat: function(name, format){
		formats[name] = format;
		return this;
	},

	defineFormats: function(formats){
		for (var name in formats) Date.defineFormat(name, formats[name]);
		return this;
	},

	//<1.2compat>
	parsePatterns: parsePatterns,
	//</1.2compat>

	defineParser: function(pattern){
		parsePatterns.push((pattern.re && pattern.handler) ? pattern : build(pattern));
		return this;
	},

	defineParsers: function(){
		Array.flatten(arguments).each(Date.defineParser);
		return this;
	},

	define2DigitYearStart: function(year){
		startYear = year % 100;
		startCentury = year - startYear;
		return this;
	}

});

var regexOf = function(type){
	return new RegExp('(?:' + Date.getMsg(type).map(function(name){
		return name.substr(0, 3);
	}).join('|') + ')[a-z]*');
};

var replacers = function(key){
	switch (key){
		case 'T':
			return '%H:%M:%S';
		case 'x': // iso8601 covers yyyy-mm-dd, so just check if month is first
			return ((Date.orderIndex('month') == 1) ? '%m[-./]%d' : '%d[-./]%m') + '([-./]%y)?';
		case 'X':
			return '%H([.:]%M)?([.:]%S([.:]%s)?)? ?%p? ?%z?';
	}
	return null;
};

var keys = {
	d: /[0-2]?[0-9]|3[01]/,
	H: /[01]?[0-9]|2[0-3]/,
	I: /0?[1-9]|1[0-2]/,
	M: /[0-5]?\d/,
	s: /\d+/,
	o: /[a-z]*/,
	p: /[ap]\.?m\.?/,
	y: /\d{2}|\d{4}/,
	Y: /\d{4}/,
	z: /Z|[+-]\d{2}(?::?\d{2})?/
};

keys.m = keys.I;
keys.S = keys.M;

var currentLanguage;

var recompile = function(language){
	currentLanguage = language;

	keys.a = keys.A = regexOf('days');
	keys.b = keys.B = regexOf('months');

	parsePatterns.each(function(pattern, i){
		if (pattern.format) parsePatterns[i] = build(pattern.format);
	});
};

var build = function(format){
	if (!currentLanguage) return {format: format};

	var parsed = [];
	var re = (format.source || format) // allow format to be regex
	 .replace(/%([a-z])/gi,
		function($0, $1){
			return replacers($1) || $0;
		}
	).replace(/\((?!\?)/g, '(?:') // make all groups non-capturing
	 .replace(/ (?!\?|\*)/g, ',? ') // be forgiving with spaces and commas
	 .replace(/%([a-z%])/gi,
		function($0, $1){
			var p = keys[$1];
			if (!p) return $1;
			parsed.push($1);
			return '(' + p.source + ')';
		}
	).replace(/\[a-z\]/gi, '[a-z\\u00c0-\\uffff;\&]'); // handle unicode words

	return {
		format: format,
		re: new RegExp('^' + re + '$', 'i'),
		handler: function(bits){
			bits = bits.slice(1).associate(parsed);
			var date = new Date().clearTime(),
				year = bits.y || bits.Y;

			if (year != null) handle.call(date, 'y', year); // need to start in the right year
			if ('d' in bits) handle.call(date, 'd', 1);
			if ('m' in bits || bits.b || bits.B) handle.call(date, 'm', 1);

			for (var key in bits) handle.call(date, key, bits[key]);
			return date;
		}
	};
};

var handle = function(key, value){
	if (!value) return this;

	switch (key){
		case 'a': case 'A': return this.set('day', Date.parseDay(value, true));
		case 'b': case 'B': return this.set('mo', Date.parseMonth(value, true));
		case 'd': return this.set('date', value);
		case 'H': case 'I': return this.set('hr', value);
		case 'm': return this.set('mo', value - 1);
		case 'M': return this.set('min', value);
		case 'p': return this.set('ampm', value.replace(/\./g, ''));
		case 'S': return this.set('sec', value);
		case 's': return this.set('ms', ('0.' + value) * 1000);
		case 'w': return this.set('day', value);
		case 'Y': return this.set('year', value);
		case 'y':
			value = +value;
			if (value < 100) value += startCentury + (value < startYear ? 100 : 0);
			return this.set('year', value);
		case 'z':
			if (value == 'Z') value = '+00';
			var offset = value.match(/([+-])(\d{2}):?(\d{2})?/);
			offset = (offset[1] + '1') * (offset[2] * 60 + (+offset[3] || 0)) + this.getTimezoneOffset();
			return this.set('time', this - offset * 60000);
	}

	return this;
};

Date.defineParsers(
	'%Y([-./]%m([-./]%d((T| )%X)?)?)?', // "1999-12-31", "1999-12-31 11:59pm", "1999-12-31 23:59:59", ISO8601
	'%Y%m%d(T%H(%M%S?)?)?', // "19991231", "19991231T1159", compact
	'%x( %X)?', // "12/31", "12.31.99", "12-31-1999", "12/31/2008 11:59 PM"
	'%d%o( %b( %Y)?)?( %X)?', // "31st", "31st December", "31 Dec 1999", "31 Dec 1999 11:59pm"
	'%b( %d%o)?( %Y)?( %X)?', // Same as above with month and day switched
	'%Y %b( %d%o( %X)?)?', // Same as above with year coming first
	'%o %b %d %X %z %Y', // "Thu Oct 22 08:11:23 +0000 2009"
	'%T', // %H:%M:%S
	'%H:%M( ?%p)?' // "11:05pm", "11:05 am" and "11:05"
);

Locale.addEvent('change', function(language){
	if (Locale.get('Date')) recompile(language);
}).fireEvent('change', Locale.getCurrent());

})();

/*
---
 
script: Date.js
 
description: Work with dates like a boss
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Trait
  - More/Date

provides:
  - LSD.Trait.Date
 
...
*/

LSD.Trait.Date = new Class({
  options: {
    date: {
      interval: 'month',
      format: '%b-%d-%Y'
    }
  },
  
  setDate: function(date) {
    this.date = date;
  },
  
  formatDate: function(date) {
    return date.format(this.options.date.format)
  },
  
  getDate: function() {
    if (this.date) return this.date;
    if (this.getRawDate) {
      var raw = this.getRawDate();
      if (raw) return this.parseDate(raw);
    }
    return this.getDefaultDate();
  },
  
  getDefaultDate: function() {
    return new Date;
  },
  
  parseDate: function(date) {
    return Date.parse(date);
  },
  
  increment: function(number) {
    number = number.toInt ? number.toInt() : 1;
    this.setDate(this.getDate().increment(this.options.date.interval, number))
  },

  decrement: function(number) {
    number = number.toInt ? number.toInt() : 1;
    this.setDate(this.getDate().decrement(this.options.date.interval, number))
  }
  
});
/*
---
name : sg-regex-tools
description : A few super-handy tools for messing around with RegExp

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : [combineRegExp]
...
*/
;(function(exports){

exports.combineRegExp = function(regex, group){
	if (regex.source) regex = [regex]
	
	var names = [], i, source = '', this_source
	
	for (i = 0; i < regex.length; ++i){ if (!regex[i]) continue
		this_source = regex[i].source || ''+regex[i]
		if (this_source == '|') source += '|'
		else {
			source += (group?'(':'') + this_source.replace(/\s/g,'') + (group?')':'')
			if (group) names.push(group)
		}
		if (regex[i].names)	names = names.concat(regex[i].names)
	}
	try {
		regex = new RegExp(source,'gm')
	}
	catch (e){
		throw new SyntaxError('Invalid Syntax: ' + source +'; '+ e)
	}
	// [key] → 1
	for (i = -1; i < names.length; ++i) names[names[i]] = i + 1
	// [1] → key
	regex.names = names
	return regex
}

}(typeof exports != 'undefined' ? exports : this))

/*
---
name    : SheetParser.CSS

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : SheetParser.CSS
requires : combineRegExp
...
*/
;(function(exports){
	

/*<depend>*/
var UNDEF = {undefined:1}
if (!exports.SheetParser) exports.SheetParser = {}

/*<CommonJS>*/
var combineRegExp = UNDEF[typeof require]
	?	exports.combineRegExp
	:	require('./sg-regex-tools').combineRegExp
var SheetParser = exports.SheetParser
/*</CommonJS>*/

/*<debug>*/;if (UNDEF[typeof combineRegExp]) throw new Error('Missing required function: "combineRegExp"');/*</debug>*/
/*</depend>*/


var CSS = SheetParser.CSS = {version: '1.0.2 dev'}

CSS.trim = trim
function trim(str){
	// http://blog.stevenlevithan.com/archives/faster-trim-javascript
	var	str = (''+str).replace(/^\s\s*/, ''),
		ws = /\s/,
		i = str.length;
	while (ws.test(str.charAt(--i)));
	return str.slice(0, i + 1);
}

CSS.camelCase = function(string){
	return ('' + string).replace(camelCaseSearch, camelCaseReplace)
}
var camelCaseSearch = /-\D/g
function camelCaseReplace(match){
	return match.charAt(1).toUpperCase()
}

CSS.parse = function(cssText){
	var	found
	,	rule
	,	rules = {length:0}
	,	keyIndex = -1
	,	regex = this.parser
	,	names = CSS.parser.names
	,	i,r,l
	,	ruleCount
	
	rules.cssText = cssText = trim(cssText)
	
	// strip comments
	cssText = cssText.replace(CSS.comment, '');
	
	regex.lastIndex = 0
	while ((found = regex.exec(cssText))){
		// avoid an infinite loop on zero-length keys
		if (regex.lastIndex == found.index) ++ regex.lastIndex
		
		// key:value
		if (found[names._key]){
			rules[rules.length ++] = found[names._key]
			rules[found[names._key]] = found[names._value]
			rules[CSS.camelCase(found[names._key])] = found[names._value]
			continue
		}
		
		rules[rules.length++] = rule = {}
		for (i = 0, l = names.length; i < l; ++i){
			if (!(names[i-1] && found[i])) continue
			rule[names[i-1]] = trim(found[i])
		}
	}
	
	var atKey, atRule, atList, atI
	for (i = 0, l = rules.length; i < l; ++i){
		if (!rules[i]) continue
		
		if (rules[i]._style_cssText){
			rules[i].style = CSS.parse(rules[i]._style_cssText)
			delete rules[i]._style_cssText
		}
		
		// _atKey/_atValue
		if (atKey = rules[i]._atKey){
			atKey = CSS.camelCase(atKey)
			atRule = {length:0}
			rules[i][atKey] = atRule
			atRule["_source"] =
			atRule[atKey + "Text"] = rules[i]._atValue
			atList = ('' + rules[i]._atValue).split(/,\s*/)
			for (atI = 0; atI < atList.length; ++atI){
				atRule[atRule.length ++] = atList[atI]
			}
			rules[i].length = 1
			rules[i][0] = atKey
			delete rules[i]._atKey
			delete rules[i]._atValue
		}
		
		if (rules[i].style)
		for (ruleCount = -1, r = -1, rule; rule = rules[i].style[++r];){
			if (typeof rule == 'string') continue
			rules[i][r] = (rules[i].cssRules || (rules[i].cssRules = {}))[++ ruleCount]  = rule
			rules[i].cssRules.length = ruleCount + 1
			rules[i].rules = rules[i].cssRules
		}
	}
	
	return rules
}

var x = combineRegExp
var OR = '|'

;(CSS.at = x(/\s*@([-a-zA-Z0-9]+)\s+(([\w-]+)?[^;{]*)/))
.names=[         '_atKey',           '_atValue', 'name']

CSS.atRule = x([CSS.at, ';'])

;(CSS.keyValue_key = x(/([-a-zA-Z0-9]+)/))
.names=[                '_key']

;(CSS.keyValue_value_end = x(/(?:;|(?=\})|$)/))

;(CSS.notString = x(/[^"']+/))
;(CSS.stringSingle = x(/"(?:[^"]|\\")*"/))
;(CSS.stringDouble = x(/'(?:[^']|\\')*'/))
;(CSS.string = x(['(?:',CSS.stringSingle ,OR, CSS.stringDouble,')']))
;(CSS.propertyValue = x([/[^;}]+/, CSS.keyValue_value_end]))

var rRound = "(?:[^()]|\\((?:[^()]|\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\))*\\))"

;(CSS.keyValue_value = x(
[
	x(['((?:'
	,	CSS.stringSingle
	,	OR
	,	CSS.stringDouble
	,	OR
	,	"\\("+rRound+"*\\)"
	,	OR
	,	/[^;}()]/ // not a keyValue_value terminator
	,	')*)'
	])
,	CSS.keyValue_value_end
])).names = ['_value']

;(CSS.keyValue = x([CSS.keyValue_key ,/\s*:\s*/, CSS.keyValue_value]))

;(CSS.comment = x(/\/\*\s*((?:[^*]|\*(?!\/))*)\s*\*\//))
.names=[                   'comment']

;(CSS.selector = x(['(',/\s*(\d+%)\s*/,OR,'(?:',/[^{}'"()]|\([^)]*\)|\[[^\]]*\]/,')+',')']))
.names=[    'selectorText','keyText']

var rCurly = "(?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\})*\\})"
var rCurlyRound = "(?:[^{}()]+|\\{(?:[^{}()]+|\\{(?:[^{}()]+|\\{(?:[^{}()]+|\\{[^{}()]*\\})*\\})*\\})*\\})"

;(CSS.block = x("\\{\\s*((?:"+"\\("+rRound+"*\\)|"+rCurly+")*)\\s*\\}"))
.names=[              '_style_cssText']

CSS.selectorBlock = x([CSS.selector, CSS.block])

CSS.atBlock = x([CSS.at, CSS.block])

CSS.parser = x
(
	[	x(CSS.comment)
	,	OR
	,	x(CSS.atBlock)
	,	OR
	,	x(CSS.atRule)
	,	OR
	,	x(CSS.selectorBlock)
	,	OR
	,	x(CSS.keyValue)
	]
,	'cssText'
);


})(typeof exports != 'undefined' ? exports : this);

/*
---
name    : SheetParser.Value

authors   : Yaroslaff Fedin

license   : MIT

requires : SheetParser.CSS

provides : SheetParser.Value
...
*/


(function(exports) {
  /*<CommonJS>*/
  var combineRegExp = (typeof require == 'undefined')
    ?  exports.combineRegExp
    :  require('./sg-regex-tools').combineRegExp
  var SheetParser = exports.SheetParser
  /*</CommonJS>*/
  
  var Value = SheetParser.Value = {version: '1.0.2 dev'};
  
  Value.translate = function(value) {
    var found, result = [], matched = [], scope = result, func, text;
    var regex = Value.tokenize;
    var names = regex.names;
    while (found = regex.exec(value)) matched.push(found);
    for (var i = 0; found = matched[i++];) {
      if (func = found[names['function']]) {
        var obj = {};
        var translated = obj[found[names['function']]] = Value.translate(found[names._arguments]);
        for (var j = 0, bit; bit = translated[j]; j++) if (bit && bit.length == 1) translated[j] = bit[0];
        scope.push(obj);
      } else if (found[names.comma]) {
        if (!result[0].push) result = [result];
        result.push(scope = []);
      } else if (found[names.whitespace]) {
        var length = scope.length;
        if (length && (scope == result) && !scope[length - 1].push) scope = scope[length - 1] = [scope[length - 1]];
        
      } else if (text = (found[names.dstring] || found[names.sstring])) {
        scope.push(text)
      } else if (text = found[names.token]) {
        if (!text.match(Value.hex)) {
          var match = Value.length.exec(text);
          Value.length.lastIndex = 0;
          if (match) {
            var number = parseFloat(match[1]);
            text = match[2] ? {number: number, unit: match[2]} : number;
          } else if (!text.match(Value.keyword)) return false;
        }
        scope.push(text);
      }
    }
    return result.length == 1 ? result[0] : result;
  }
  
  var x = combineRegExp
  var OR = '|'
  var rRound = "(?:[^()]|\\((?:[^()]|\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\))*\\))";

  ;(Value.stringDouble = x(/"((?:[^"]|\\")*)"/)).names = ['dstring']
  ;(Value.stringSingle = x(/'((?:[^']|\\')*)'/)).names = ['sstring']
  ;(Value.string = x([Value.stringSingle, OR, Value.stringDouble]))
  ;(Value.keyword = x(/[-a-zA-Z0-9]+/, "keyword"))
  ;(Value.token = x(/[^$,\s\/)]+/, "token"))
  
  ;(Value['function'] = x("([-_a-zA-Z0-9]+)\\((" + rRound + "*)\\)"))
  .names = [               'function',       '_arguments']
  
  ;(Value.integer = x(/-?\d+/))
  ;(Value.float = x(/-?\d+\.\d*/))
  ;(Value.number = x(['(', Value.float,  OR, Value.integer, ')']))
  .names = [           'number']

  ;(Value.unit = x(/em|px|pt|%|fr|deg/, 'unit'))
  ;(Value.length = x(['^', Value.number, Value.unit, "?$"]))
  ;(Value.direction = x(/top|left|bottom|right|center/, 'direction'))
  ;(Value.position = x([Value.length, OR, Value.direction]))

  ;(Value.hex = x(/#[0-9a-z]+/, 'hex'))

  ;(Value.comma = x(/\s*,\s*/, 'comma'))
  ;(Value.whitespace = x(/\s+/, 'whitespace'))
  ;(Value.slash = x(/\//, 'slash'))


  Value.tokenize = x
  (
    [ x(Value['function']),
    , OR
    , x(Value.comma)
    , OR
    , x(Value.whitespace)
    , OR
    , x(Value.slash)
    , OR
    , x(Value.string)
    , OR
    , x(Value.token)
    ]
  )
  
})(typeof exports != 'undefined' ? exports : this);
/*
---
 
script: Interpolation.js
 
description: A logic to render (and nest) widgets out of the key-value hash or dom tree
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
  - Sheet/SheetParser.Value
  - String.Inflections/String.pluralize

provides: 
  - LSD.Interpolation
 
...
*/


!function() {
  LSD.Interpolation = {}
  var helpers = LSD.Interpolation.helpers = {
    pluralize: function(count, singular, plural) {
      var value = (count == 1) ? singular : (plural || (singular.pluralize()));
      return value.replace("%", count);
    },
    auto_pluralize: function(count, singular, plural) {
      return count + " " + helpers.pluralize(count, singular, plural);
    }
  }
  
  var regex = SheetParser.Value.tokenize;
  var parsed = {};
  
  var interpolate = LSD.Interpolation.interpolate = function(name, callback, simple) {
    if (!simple || (name.indexOf('(') > -1)) return execute(translate(name), callback);
    return callback(name);
  }
  
  var translate = LSD.Interpolation.translate = function(value) {
    var cached = parsed[name];
    if (cached) return cached;
    var found, result = [], matched = [], scope = result, func, text;
    var names = regex.names;
    while (found = regex.exec(value)) matched.push(found);
    for (var i = 0; found = matched[i++];) {
      if (func = found[names['function']]) {
        var translated = translate(found[names._arguments]);
        for (var j = 0, bit; bit = translated[j]; j++) if (bit && bit.length == 1) translated[j] = bit[0];
        scope.push({fn: func, arguments: translated});
      } else if (text = (found[names.dstring] || found[names.sstring])) {
        scope.push(text)
      } else if (text = found[names.token]) {
        scope.push({fn: interpolate, arguments: [text, true], callback: true})
      }
    }
    return (parsed[value] = (result.length == 1 ? result[0] : result));
  }
  
  var execute = LSD.Interpolation.execute = function(command, callback) {
    var fn = command.fn;
    if (fn) {
      var func = fn.indexOf ? (helpers[fn] || (callback(fn))) : fn;
      if (!func) {
        console.error(fn, ' interpoaltion function is not found');
        return "";
      }
      var args = Array.prototype.slice.call(command.arguments, 0);
      for (var i = 0, j = args.length; i < j; i++) args[i] = execute(args[i], callback);
      if (command.callback) args.splice(1, 0, callback);
      return func.apply(this, args);
    }
    return command;
  }
  
}();
/*
---
 
script: Layout.js
 
description: A logic to render (and nest) widgets out of the key-value hash or dom tree
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
  - More/Object.Extras
  - LSD.Interpolation

provides: 
  - LSD.Layout
 
...
*/

!function() {
  
/* 
  Layout takes any tree-like structure and tries
  to build layout that representats that structure.
  
  The structure can be an objects with keys as selectors
  and values with other objects, arrays and strings.
  
  You can also build a widget tree from DOM. Layout will
  extract attributes and classes from elements. There are
  three methods of conversion element to widget:
  
  * Augment - Tries to use element in widget with minimal
              changes. (default)
  * Modify  - Builds widget with new element and replaces 
              the original element (fallback, destructive)
  * Clone   - Builds new element, original element untouched
*/

LSD.Layout = function(widget, layout, options) {
  this.setOptions(options);
  this.context = LSD[this.options.context.capitalize()];
  if (widget) if (!layout && !widget.lsd) {
    layout = widget;
    widget = null;
  } else if (!widget.lsd) widget = this.convert(widget);
  if (layout) this.result = this.render(layout, widget);
};

LSD.Layout.prototype = Object.append(new Options, {
  
  options: {
    method: 'augment',
    fallback: 'modify',
    context: 'element',
    interpolate: null
  },
  
  render: function(layout, parent, method, opts) {
    if (!layout.lsd) {
      var type = layout.push ? 'array' : layout.nodeType ? LSD.Layout.NodeTypes[layout.nodeType] : layout.indexOf ? 'string' : 'object';
      if (type) return this[type](layout, parent, method, opts);
    } else if (parent) return this.appendChild(layout, parent);
  },
  
  materialize: function(selector, layout, parent, opts) {
    var widget = this.build(Object.append({}, opts, this.parse(selector, parent)), parent);
    //debugger
    if (parent) this.appendChild(widget, parent)
    if (layout) if (layout.charAt) widget.write(layout);
    else this.render(layout, widget, null, opts);
    return widget;
  },
  
  /* 
    Parsers selector and generates options for layout 
  */
  
  interpolate: function(string, object) {
    if (!object) object = this.options.interpolate;
    var self = this;
    return string.replace(/\\?\{([^{}]+)\}/g, function(match, name){
      if (match.charAt(0) == '\\') return match.slice(1);
      var value = object.call ? LSD.Interpolation.interpolate(name, object) : object[string];
      self.interpolated = true;
      return (value != null) ? value : '';
    });
  },
  
  parse: function(selector, parent) {
    if (!this.parsed) this.parsed = {};
    else if (this.parsed[selector]) return this.parsed[selector];
    var options = {};
    var parsed = Slick.parse(selector).expressions[0][0]
    if (parsed.tag != '*') options.source = parsed.tag;
    if (parsed.id) (options.attributes || (options.attributes = {})).id = parsed.id
    if (parsed.attributes) parsed.attributes.each(function(attribute) {
      var value = attribute.value || LSD.Attributes.Boolean[attribute.key] || "";
      (options.attributes || (options.attributes = {}))[attribute.key] = value;
    });
    if (parsed.classes) options.classes = parsed.classes.map(Macro.map('value'));
    if (parsed.pseudos) {
      options.pseudos = [];
      parsed.pseudos.each(function(pseudo) {
        if (pseudo.type == 'element') {
          var relation = (parent[0] || parent).relations[pseudo.key];
          if (!relation) throw "Unknown pseudo element ::" + pseudo.key
          Object.append(options, this.parse(relation.layout, parent))
        } else return options.pseudos.push(pseudo.key);
      }, this);
    }
    switch (parsed.combinator) {
      case '^':
        options.inherit = 'full';
        break;
      case '>':
        options.inherit = 'partial';
    }
    return (this.parsed[selector] = options);
  },
  
  convert: function(element, parent, mutated, opts) {
    if (mutated == null) mutated = this.mutate(element, parent);
    if (mutated || this.isConvertable(element, parent)) return this.make(element, parent, mutated, opts);
  },
  
  patch: function(element, parent, mutated, opts) {
    if (this.isAugmentable(element, parent, mutated)) return this.make(element, parent, mutated, opts, true);
  },
  
  make: function(element, parent, mutated, opts, reuse) {
    var extracted = mutated || (LSD.Layout.extract(element));
    return this.build(Object.append({}, opts, extracted), parent && parent.call ? parent(element) : parent, reuse ? element : null)
  },
  
  build: function(options, parent) {
    var tag = options.source || options.tag, attributes = options.attributes;
    if (attributes) {
      if ('type' in attributes) tag += "-" + attributes.type;
      if ('kind' in attributes) tag += "-" + attributes.kind;
      var interpolate = this.options.interpolate;
      for (var name in attributes) if (interpolate) attributes[name] = this.interpolate(attributes[name]);
    }
    Object.merge(options, {layout: {render: false}});
    if (options.inherit && parent) {
      if (parent.options) {
        var source = parent.options.source;
        if (!source) {
          var bits = [parent.tagName, parent.getAttribute('type')];
          if (options.inherit == 'full') bits.push(parent.getAttribute('kind'));
          source = bits.filter(function(bit) { return bit }).join('-');
        }
      } else if (parent.indexOf) var source = parent;
      if (source) tag = source + '-' + tag;
    }
    var args = Array.prototype.slice.call(arguments, 0);
    args.splice(1, 1); //remove parent
    LSD.Layout.current = this;
    return this.context.create.apply(this.context, [tag].concat(args));
  },
  
  /*
    Tries given method. Retries with fallback.
  */
  
  translate: function(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this[method].apply(this, args) || (this.options.fallback && this[this.options.fallback].apply(this, args));
  },
  
  // methods
  
  /* 
    Replaces an element with a widget. Also replaces
    all children widgets when possible. 
  */
  modify: function(element, parent, mutated) {
    var converted = this.convert(element, parent, mutated);
    if (converted) {
      var replacement = converted.toElement();
      replacement.replaces(element);
      var node, next = element.firstChild;
      while (node = next) {
        next = next.nextSibling;
        replacement.appendChild(node);
      }
    }
    return converted;
  },
  
  /*
    Augment tries to avoid making changes to element
    at all costs and tries to use the whole tree. Used
    as a primary method in regular HTML applications.
  */
  augment: function(element, parent, mutated, opts) {
    return this.patch(element, parent, mutated, opts);
  },
  
  /*
    Creates an independent widget tree and replaces
    the original DOM leaving it unchanged. Useful
    to keep an element as a template and clone it
    many times after. Textnodes are cloned too.
  */
  
  clone: function(element, parent, mutated, opts) {
    var converted = this.convert(element, parent, mutated, opts)
    if (parent && parent.call) parent = parent(element);
    if (parent) {
      if (converted) {
        converted.inject(parent[0] || parent);
      } else {
        (parent.toElement ? parent.toElement() : parent).appendChild(element.cloneNode(false));
      }
    }
    return converted;
  },
  
  // type handlers
  
  string: function(string, parent, method, opts) {
    return this.materialize(string, {}, parent, opts);
  },
  
  array: function(array, parent, method, opts) {
    return array.map(function(widget) { return this.render(widget, parent, method, opts)}.bind(this));
  },
  
  elements: function(elements, parent, method, opts) {
    return elements.map(function(widget) { return this.render(widget, parent, method, opts)}.bind(this));
  },
  
  element: function(element, parent, method, opts) {
    var converted = element.uid && Element.retrieve(element, 'widget');
    var skip = (method === false);
    if (!method) method = this.options.method;
    var augmenting = (method == 'augment'), cloning = (method == 'clone');
    var children = LSD.slice(element.childNodes);
    if (!converted || !augmenting) {
      var ascendant = (parent && parent[1]) || parent;
      var mutated = this.mutate(element, ascendant);
      if (mutated || this.isConvertable(element, ascendant)) {
        var widget = this.translate(method, element, ascendant, mutated, opts);
      } else if (cloning) {  
        var clone = element.cloneNode(false);
      }
    } else var widget = converted;
    var child = widget || clone;
    if (cloning) {
      var textnode = LSD.Layout.TextNodes[LSD.toLowerCase(element.tagName)];
      if (textnode) this.render(children, clone ? [clone, parent] : widget || parent, method)
    }
    if (parent && child) this.appendChild(child, parent[0] || parent);
    if (!textnode) this.render(children, clone ? [clone, parent] : widget || parent, method, opts);
    return clone || widget || element;
  },
  
  textnode: function(element, parent, method) {
    if (!method) method = this.options.method;
    if (method != 'augment') {
      var value = element.textContent;
      if (this.options.interpolate) var interpolated = this.interpolate(value);
      var textnode = element.ownerDocument.createTextNode(interpolated || value);
      if (method != 'clone') {
        if (interpolated != null && interpolated != value) element.parentNode.replaceChild(textnode)
      } else this.appendChild(textnode, parent[0] || parent)
    }
    return textnode || element;
  },
  
  fragment: function(element, parent, method, opts) {
    return this.walk(element, parent, method, opts);
  },
  
  object: function(object, parent, method, opts) {
    var widgets = [];
    for (var selector in object) {
      widgets.push(this.materialize(selector, object[selector] === true ? null : object[selector], parent, opts));
    }
    return widgets;
  },
  
  walk: function(element, parent, method, opts) {
    for (var nodes = LSD.slice.call(element.childNodes, 0), i = 0, node; node = nodes[i++];) {
      if (node.nodeType && node.nodeType != 8) this.render(node, parent, method, opts);
    }
  },
  
  find: function(element, root, opts) {
    var selected = element.getElementsByTagName("*");
    for (var children = [], i = 0, j = selected.length; i < j; i++) children[i] = selected[i];
    var found = {};
    var getParent = function(node) {
      var parent = null;
      while (node = node.parentNode) if (node == element || node.uid && (parent = found[node.uid])) break;
      return parent || root;
    };
    for (var i = 0, child; child = children[i++];) {
      var widget = this.render(child, getParent, false, opts);
      if (widget && widget.element) found[widget.element.uid] = widget;
    }
  },
  
  appendChild: function(child, parent) {
    if (child.nodeType && (!parent.call || (child.element && (parent = parent(child.element))))) {
      if (!child.parentNode || (child.parentNode != parent && child.parentNode != parent.element)) { 
        if (child.toElement) child.toElement();
        if (parent.toElement) parent.toElement();
        if (child.element && parent.element) {
          child.inject(parent, child.element.parentNode ? false : 'bottom')
        } else (parent.element || parent).appendChild(child.element || child);
      }
    }
  },
  
  // mutations
  
  merge: function(first, second) {
    var result = {layout: first.layout}, id, combinator;
    result.source = second.source || first.source;
    if (combinator = (second.combinator || first.combinator)) result.combinator = combinator;
    if (second.attributes || first.attributes) result.attributes = Object.append({}, first.attributes, second.attributes);
    if (second.classes || first.classes) result.classes = Array.concat([], first.classes || [], second.classees || []);
    if (second.pseudos || first.pseudos) result.pseudos = Array.concat([], first.pseudos || [], second.pseudos || []);
    return result;
  },
  
  mutate: function(element, parent) {
    if (!(parent && (parent = parent[1] || parent) && parent.mutateLayout)) return false;
    var mutation = parent.mutateLayout(element, this);
    if (mutation) return this.merge(LSD.Layout.extract(element), mutation.indexOf ? this.parse(mutation, parent) : mutation);
  },
  
  // redefinable predicates
  
  isConvertable: function(element, parent) {
    return !!this.context.find(LSD.toLowerCase(element.tagName));
  },
  
  isAugmentable: function(element, parent, mutated) {
    if (element.nodeType != 1) return true;
    var tag = LSD.toLowerCase(element.tagName);
    if (!mutated) {
      var type = element.getAttribute('type');
      var source = (type && type != tag) ? tag + '-' + type : tag;
    } else var source = mutated.source;
    var klass = this.context.find(LSD.toLowerCase(source));
    if (!klass) return;
    var opts = klass.prototype.options;
    return !opts || !opts.element || !opts.element.tag || (opts.element.tag == tag);
  }
  
});

LSD.Layout.NodeTypes = {1: 'element', 3: 'textnode', 11: 'fragment'};
LSD.Layout.TextNodes = Array.fast('script', 'button', 'textarea', 'option', 'input');

/* 
  Extracts options from a DOM element.
  
  Following selectors considered equal:
  
  footer#bottom.left
  div.lsd.footer.id-bottom.left
  div.tag-footer.id-bottom.left
  div.tag-footer[id=bottom][class=left]
*/

LSD.Layout.extract = function(element) {
  var options = {
    attributes: {},
    origin: element
  };
  var tag = LSD.toLowerCase(element.tagName);
  if (tag != 'div') options.source = tag;
  
  for (var i = 0, attribute, name; (attribute = element.attributes[i++]) && (name = attribute.name);)
    options.attributes[name] = attribute.value || LSD.Attributes.Boolean[name] || "";
    
  if (options.attributes && options.attributes.inherit) {
    options.inherit = options.attributes.inherit;
    delete options.attributes.inherit;
  }
  
  if (element.id) options.attributes.id = element.id;
  
  var klass = options.attributes['class'];
  if (klass) {
    klass = klass.replace(/^lsd\s+(?:tag-)?([a-zA-Z0-9-_]+)\s?/, function(m, tag) {
      options.source = tag;
      return '';
    })
    options.classes = klass.split(/\s+/).filter(function(name) {
      switch (name.substr(0, 3)) {
        case "is-":
          if (!options.pseudos) options.pseudos = [];
          options.pseudos.push(name.substr(3, name.length - 3));
          break;
        case "id-":
          options.attributes.id = name.substr(3, name.length - 3);
          break;
        default:
          return true;
      }
    })
    delete options.attributes['class'];
  }
  return options;
};

['modify', 'augment', 'clone'].each(function(method) {
  LSD.Layout[method] = function(element, layout, options) {
    return new LSD.Layout(element, layout, Object.append({method: method}, options)).result;
  }
});


}();

/*
---
 
script: Expression.js
 
description: Adds layout capabilities to widget (parse and render widget trees from objects)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - LSD.Layout

provides: 
  - LSD.Module.Layout
 
...
*/
  
LSD.Module.Layout = new Class({
  options: {
    layout: {
      render: true,
      extract: false,
      options: {}
    }
  },
  
  initializers: {
    layout: function(options) {
      return {
        events: {
          self: {
            /*
              Extracts and sets layout options from attach element
            */
            attach: function(element) {
              if (this.extracted || !options.layout.extract) return;
              this.extracted = LSD.Layout.extract(element);
              this.setOptions(this.extracted)
            },
            /*
              Unsets options previously extracted from the detached element
            */
            detach: function() {
              if (!this.extracted) return;
              this.unsetOptions(this.extracted)
              delete this.extracted;
            },
            /*
              Mutate element when layout is set to clone.
            */
            beforeBuild: function(options) {
              var layout = this.options.layout, clone = layout.options.method == 'clone';
              if (!options.element || !(clone || layout.extract)) return;
              this.extracted = LSD.Layout.extract(options.element);
              this.setOptions(this.extracted);
              this.origin = options.element;
              if (clone) options.convert = false;
            },
            /*
              Builds more dependent layout when element is built
            */
            build: function() {
              var layout = this.options.layout;
              if (this.origin || layout.render) 
                this.buildLayout(Array.prototype.slice.call((this.origin || this.element).childNodes, 0));
              if (layout.children) this.buildLayout(layout.children);
            },
            /*
              Augments all parsed HTML that goes through standart .write() interface
            */
            write: 'augmentLayout',
            /*
              Augments all inserted nodes that come from partial html updates
            */
            DOMNodeInserted: 'augmentLayout'
          },
          
          //applied only when mutations are set
          mutations: {
            mutateLayout: 'onMutateLayout'
          }
        }
      }
    }
  },
  
  mutateLayout: function(element, layout) {
    var query = {element: element, layout: layout, parent: this};
    this.dispatchEvent('mutateLayout', query);
    if (query.mutation) return query.mutation;
  },
  
  onMutateLayout: function(query) {
    var element = query.element;
    var mutations = (this.mutations[LSD.toLowerCase(element.tagName)] || []).concat(this.mutations['*'] || []);
    for (var i = 0, mutation; mutation = mutations[i++];) {
      if (Slick.match(element, mutation[0], this.element)) query.mutation = mutation[1];
    }
  },
  
  addMutation: function(selector, mutation) {
    LSD.Module.Events.setEventsByRegister.call(this, 'mutations', true);
    if (!this.mutations) this.mutations = {};
    selector.split(/\s*,\s*/).each(function(bit) {
      var parsed = Slick.parse(bit);
      var tag = parsed.expressions[0].getLast().tag;
      var group = this.mutations[tag];
      if (!group) group = this.mutations[tag] = [];
      group.push([parsed, mutation]);
    }, this)
  },
  
  removeMutation: function(selector, mutation) {
    LSD.Module.Events.setEventsByRegister.call(this, 'mutations', false);
    selector.split(/\s*,\s*/).each(function(bit) {
      var parsed = Slick.parse(bit);
      var tag = parsed.expressions[0].getLast().tag;
      var group = this.mutations[tag];
      for (var i = 0, mutation; mutation = group[i]; i++)
        if (group[0] == parsed && parsed[1] == mutation) group.splice(i--, 1);
    }, this)
  },
  
  getLayout: Macro.getter('layout', function() {
    return new LSD.Layout(this, null, this.options.layout.options);
  }),
  
  buildLayout: function(layout, parent, options) {
    return this.getLayout().render(layout, parent || this, null, options);
  },
  
  augmentLayout: function(layout, parent, options) {
    return this.getLayout().render(layout, parent || this, 'augment', options);
  }
});

LSD.Options.mutations = {
  add: 'addMutation',
  remove: 'removeMutation',
  iterate: true
};
/*
---
name    : SheetParser.Property

authors   : Yaroslaff Fedin

license   : MIT

requires : SheetParser.CSS

provides : SheetParser.Property
...
*/


(function(exports) {
  /*<CommonJS>*/
  var combineRegExp = (typeof require == 'undefined')
    ?  exports.combineRegExp
    :  require('./sg-regex-tools').combineRegExp
  var SheetParser = exports.SheetParser
  /*</CommonJS>*/
  
  var Property = SheetParser.Property = {version: '0.2 dev'};
  
  /*
    Finds optional groups in expressions and builds keyword
    indecies for them. Keyword index is an object that has
    keywords as keys and values as property names.
    
    Index only holds keywords that can be uniquely identified
    as one of the properties in group.
  */
  
  Property.index = function(properties, context) {
    var index = {};
    for (var i = 0, property; property = properties[i]; i++) {
      if (property.push) {
        var group = index[i] = {};
        for (var j = 0, prop; prop = property[j]; j++) {
          var keys = context[prop].keywords;
          if (keys) for (var key in keys) {
            if (group[key] == null) group[key] = prop;
            else group[key] = false;
          }
        }
        for (var keyword in group) if (!group[keyword]) delete group[keyword];
      }
    }
    return index;
  };
  
  /*
    Simple value 
  */

  Property.simple = function(types, keywords) {
    return function(value) {
      if (keywords && keywords[value]) return true;
      if (types) for (var i = 0, type; type = types[i++];) if (Type[type](value)) return true;
      return false;
    }
  };
  
  /*
    Links list of inambigous arguments with corresponding properties keeping
    the order.
  */
  
  Property.shorthand = function(properties, keywords, context) {
    var index, r = 0;
    for (var i = 0, property; property = properties[i++];) if (!property.push) r++;
    return function() {
      var result = [], used = {}, start = 0, group, k = 0, l = arguments.length;
      for (var i = 0, argument; argument = arguments[i]; i++) {
        var property = properties[k];
        if (!property) return false;
        if ((group = (property.push && property))) property = properties[k + 1];
        if (property) {
          if (context[property](argument)) k++
          else property = false
        }
        if (group) {
          if (!property) {
            if (!index) index = Property.index(properties, context)
            if (property = index[k][argument])
              if (used[property]) return false;
              else used[property] = 1;
          }
          if ((property && !used[property]) || (i == l - 1)) {
            if (i - start > group.length) return false;
            for (var j = start; j < (i + +!property); j++) 
              if (!result[j])
                for (var m = 0, optional; optional = group[m++];) {
                  if (!used[optional] && context[optional](arguments[j])) {
                    result[j] = optional;
                    used[optional] = true
                    break;
                  }
                }
            start = i;
            k++;
          }
        }
        if (result[i] == null) result[i] = property;
      }
      if (i < r) return false
      for (var i = 0, j = arguments.length, object = {}; i < j; i++) {
        var value = result[i];
        if (!value) return false;
        object[value] = arguments[i];
      }
      return object;
    };
  }

  /*
    A shorthand that operates on collection of properties. When given values
    are not enough (less than properties in collection), the value sequence
    is repeated until all properties are filled.     
  */

  Property.collection = function(properties, keywords, context) {
    var first = context[properties[0]];
    if (first.type != 'simple') 
      return function(arg) {
        var args = (!arg || !arg.push) ? [Array.prototype.slice.call(arguments)] : arguments;
        var length = args.length;
        var result = {};
        for (var i = 0, property; property = properties[i]; i++) {
          var values = context[property].apply(1, args[i] || args[i % 2] || args[0]);
          if (!values) return false;
          for (var prop in values) result[prop] = values[prop];
        }
        return result;
      }
    else
      return function() {
        var length = arguments.length;
        var result = {};
        for (var i = 0, property; property = properties[i]; i++) {
          var values = arguments[i] || arguments[i % 2] || arguments[0];
          if (!context[property].call(1, values)) return false;
          result[property] = values;
        }
        return result;
      }
  };
  
  /* 
    Multiple value property accepts arrays as arguments
    as well as regular stuff
  */
  
  Property.multiple = function(arg) {
    //if (arg.push)
  }
  
  Property.compile = function(definition, context) {
    var properties, keywords, types;
    for (var i = 0, bit; bit = definition[i++];) {
      if (bit.push) properties = bit;
      else if (bit.indexOf) {
        if (!Type[bit]) {
          if (!keywords) keywords = {};
          keywords[bit] = 1;
        } else types ? types.push(bit) : (types = [bit]);
      } else options = bit;
    }
    var type = properties ? (keywords && keywords.collection ? "collection" : "shorthand") : 'simple'
    var property = Property[type](properties || types, keywords, context);
    if (keywords) property.keywords = keywords;
    if (properties) {
      var props = [];
      for (var i = 0, prop; prop = properties[i++];) prop.push ? props.push.apply(props, prop) : props.push(prop);
      property.properties = props;
    }
    property.type = type;
    return property;
  };
  
  
  var Type = Property.Type = {
    length: function(obj) {
      return typeof obj == 'number' || (!obj.indexOf && ('number' in obj) && obj.unit && (obj.unit != '%'))
    },
  
    color: function(obj) {
      return obj.indexOf ? obj.match(/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/) : (obj.isColor || obj.rgba || obj.rgb || obj.hsb)
    },
    
    number: function(obj) {
      return typeof obj == 'number'
    },
    
    integer: function(obj) {
      return obj % 1 == 0 && ((0 + obj).toString() == obj)
    },
  
    keyword: function(keywords) {
      var storage;
      for (var i = 0, keyword; keyword = keywords[i++];) storage[keyword] = 1;
      return function(keyword) {
        return !!storage[keyword]
      }
    },
    
    strings: function(obj) {
      return !!obj.indexOf
    },
    
    url: function(obj) {
      return !obj.indexOf && ("url" in obj);
    },
    
    position: function(obj) {        
      var positions = Type.position.positions;
      if (!positions) positions = Type.position.positions = {left: 1, top: 1, bottom: 1, right: 1, center: 1}
      return positions[obj]
    },
    
    percentage: function(obj) {
      return obj.unit == '%'
    }
  };
  
})(typeof exports != 'undefined' ? exports : this);
/*
---
name    : SheetParser.Styles

authors   : Yaroslaff Fedin

license   : MIT

requires : SheetParser.Property

provides : SheetParser.Styles
...
*/

(function() {
   
var SheetParser = (typeof exports == 'undefined') ? window.SheetParser : exports.SheetParser;
var CSS = SheetParser.Properties = {
  background:           [[['backgroundColor', 'backgroundImage', 'backgroundRepeat', 
                          'backgroundAttachment', 'backgroundPositionX', 'backgroundPositionY']], 'multiple'],
  backgroundColor:      ['color', 'transparent', 'inherit'],
  backgroundImage:      ['url', 'none', 'inherit'],
  backgroundRepeat:     ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'inherit', 'space', 'round'],
  backgroundAttachment: ['fixed', 'scroll', 'inherit', 'local', 'fixed'],
  backgroundPosition:   [['backgroundPositionX', 'backgroundPositionY']],
  backgroundPositionX:  ['percentage', 'center', 'left', 'right', 'length', 'inherit'],
  backgroundPositionY:  ['percentage', 'center', 'top', 'bottom', 'length', 'inherit'],
   
  textShadow:           [['textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY', 'textShadowColor'], 'multiple'],
  textShadowBlur:       ['length'],
  textShadowOffsetX:    ['length'],
  textShadowOffsetY:    ['length'],
  textShadowColor:      ['color'],
                        
  boxShadow:            [['boxShadowBlur', 'boxShadowOffsetX', 'boxShadowOffsetY', 'boxShadowColor'], 'multiple'],
  boxShadowBlur:        ['length'],
  boxShadowOffsetX:     ['length'],
  boxShadowOffsetY:     ['length'],
  boxShadowColor:       ['color'], 
  
  outline:              ['outlineWidth', 'outlineStyle', 'outlineColor'],
  outlineWidth:         ['length'],
  outlineStyle:         ['dotted', 'dashed', 'solid', 'double', 'groove', 'reidge', 'inset', 'outset'],
  outlineColor:         ['color'],
                        
  font:                 [[
                          ['fontStyle', 'fontVariant', 'fontWeight'], 
                          'fontSize', 
                          ['lineHeight'], 
                          'fontFamily'
                        ]],
  fontStyle:            ['normal', 'italic', 'oblique', 'inherit'],
  fontVariant:          ['normal', 'small-caps', 'inherit'],
  fontWeight:           ['normal', 'number', 'bold', 'inherit'],
  fontFamily:           ['strings', 'inherit'],
  fontSize:             ['length', 'percentage', 'inherit', 
                         'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger'],
                        
  color:                ['color'],
  letterSpacing:        ['normal', 'length', 'inherit'],
  textDecoration:       ['none', 'capitalize', 'uppercase', 'lowercase'],
  textAlign:            ['left', 'right', 'center', 'justify'],
  textIdent:            ['length', 'percentage'],                 
  lineHeight:           ['normal', 'length', 'number', 'percentage'],
  
  height:               ['length', 'auto'],
  maxHeight:            ['length', 'auto'],
  minHeight:            ['length', 'auto'],
  width:                ['length', 'auto'],
  maxWidth:             ['length', 'auto'],
  minWidth:             ['length', 'auto'],
                        
  display:              ['inline', 'block', 'list-item', 'run-in', 'inline-block', 'table', 'inline-table', 'none', 
                         'table-row-group', 'table-header-group', 'table-footer-group', 'table-row', 
                         'table-column-group', 'table-column', 'table-cell', 'table-caption'],
  visibility:           ['visible', 'hidden'],
  'float':              ['none', 'left', 'right'],
  clear:                ['none', 'left', 'right', 'both', 'inherit'],
  overflow:             ['visible', 'hidden', 'scroll', 'auto'],
  position:             ['static', 'relative', 'absolute', 'fixed'],
  top:                  ['length', 'auto'],
  left:                 ['length', 'auto'],
  right:                ['length', 'auto'],
  bottom:               ['length', 'auto'],
  zIndex:               ['integer'],
  cursor:               ['auto', 'crosshair', 'default', 'hand', 'move', 'e-resize', 'ne-resize', 'nw-resize', 
                         'n-resize', 'se-resize', 'sw-resize', 's-resize', 'w-resize', 'text', 'wait', 'help']
};

var expanded = ['borderWidth', 'borderColor', 'borderStyle', 'padding', 'margin', 'border'];
for (var side, sides = ['Top', 'Right', 'Bottom', 'Left'], i = 0; side = sides[i++];) {
  CSS['border' + side]           = [['border' + side + 'Width', 'border' + side + 'Style', 'border' + side + 'Color']];
  
  CSS['border' + side + 'Width'] = ['length', 'thin', 'thick', 'medium'];
  CSS['border' + side + 'Style'] = ['none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'inherit', 'none'];
  CSS['border' + side + 'Color'] = ['color'];
  
  CSS['margin' + side]           = ['length', 'percentage', 'auto'];
  CSS['padding' + side]          = ['length', 'percentage', 'auto'];

  for (var j = 0, prop; prop = expanded[j++];) {
    if (!CSS[prop]) CSS[prop] = [[]];
    CSS[prop][0].push(prop.replace(/^([a-z]*)/, '$1' + side));
    if (i == 4) CSS[prop].push('collection')
  }

  if (i % 2 == 0) 
    for (var j = 1, adj; adj = sides[j+=2];) 
      CSS['borderRadius' + side + adj] = ['length', 'none'];
};

var Styles = SheetParser.Styles = {}
for (var property in CSS) Styles[property] = SheetParser.Property.compile(CSS[property], Styles);

})();
/*
---
name: Slick.Parser
description: Standalone CSS3 Selector parser
provides: Slick.Parser
...
*/

;(function(){

var parsed,
	separatorIndex,
	combinatorIndex,
	reversed,
	cache = {},
	reverseCache = {},
	reUnescape = /\\/g;

var parse = function(expression, isReversed){
	if (expression == null) return null;
	if (expression.Slick === true) return expression;
	expression = ('' + expression).replace(/^\s+|\s+$/g, '');
	reversed = !!isReversed;
	var currentCache = (reversed) ? reverseCache : cache;
	if (currentCache[expression]) return currentCache[expression];
	parsed = {
		Slick: true,
		expressions: [],
		raw: expression,
		reverse: function(){
			return parse(this.raw, true);
		}
	};
	separatorIndex = -1;
	while (expression != (expression = expression.replace(regexp, parser)));
	parsed.length = parsed.expressions.length;
	return currentCache[parsed.raw] = (reversed) ? reverse(parsed) : parsed;
};

var reverseCombinator = function(combinator){
	if (combinator === '!') return ' ';
	else if (combinator === ' ') return '!';
	else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
	else return '!' + combinator;
};

var reverse = function(expression){
	var expressions = expression.expressions;
	for (var i = 0; i < expressions.length; i++){
		var exp = expressions[i];
		var last = {parts: [], tag: '*', combinator: reverseCombinator(exp[0].combinator)};

		for (var j = 0; j < exp.length; j++){
			var cexp = exp[j];
			if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
			cexp.combinator = cexp.reverseCombinator;
			delete cexp.reverseCombinator;
		}

		exp.reverse().push(last);
	}
	return expression;
};

var escapeRegExp = function(string){// Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
	return string.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, function(match){
		return '\\' + match;
	});
};

var regexp = new RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
	"(?x)^(?:\
	  \\s* ( , ) \\s*               # Separator          \n\
	| \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
	|      ( \\s+ )                 # CombinatorChildren \n\
	|      ( <unicode>+ | \\* )     # Tag                \n\
	| \\#  ( <unicode>+       )     # ID                 \n\
	| \\.  ( <unicode>+       )     # ClassName          \n\
	|                               # Attribute          \n\
	\\[  \
		\\s* (<unicode1>+)  (?:  \
			\\s* ([*^$!~|]?=)  (?:  \
				\\s* (?:\
					([\"']?)(.*?)\\9 \
				)\
			)  \
		)?  \\s*  \
	\\](?!\\]) \n\
	|   :+ ( <unicode>+ )(?:\
	\\( (?:\
		(?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+)\
	) \\)\
	)?\
	)"
*/
	"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
	.replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
	.replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
	.replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
);

function parser(
	rawMatch,

	separator,
	combinator,
	combinatorChildren,

	tagName,
	id,
	className,

	attributeKey,
	attributeOperator,
	attributeQuote,
	attributeValue,

	pseudoMarker,
	pseudoClass,
	pseudoQuote,
	pseudoClassQuotedValue,
	pseudoClassValue
){
	if (separator || separatorIndex === -1){
		parsed.expressions[++separatorIndex] = [];
		combinatorIndex = -1;
		if (separator) return '';
	}

	if (combinator || combinatorChildren || combinatorIndex === -1){
		combinator = combinator || ' ';
		var currentSeparator = parsed.expressions[separatorIndex];
		if (reversed && currentSeparator[combinatorIndex])
			currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
		currentSeparator[++combinatorIndex] = {combinator: combinator, tag: '*'};
	}

	var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

	if (tagName){
		currentParsed.tag = tagName.replace(reUnescape, '');

	} else if (id){
		currentParsed.id = id.replace(reUnescape, '');

	} else if (className){
		className = className.replace(reUnescape, '');

		if (!currentParsed.classList) currentParsed.classList = [];
		if (!currentParsed.classes) currentParsed.classes = [];
		currentParsed.classList.push(className);
		currentParsed.classes.push({
			value: className,
			regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
		});

	} else if (pseudoClass){
		pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
		pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

		if (!currentParsed.pseudos) currentParsed.pseudos = [];
		currentParsed.pseudos.push({
			key: pseudoClass.replace(reUnescape, ''),
			value: pseudoClassValue,
			type: pseudoMarker.length == 1 ? 'class' : 'element'
		});

	} else if (attributeKey){
		attributeKey = attributeKey.replace(reUnescape, '');
		attributeValue = (attributeValue || '').replace(reUnescape, '');

		var test, regexp;

		switch (attributeOperator){
			case '^=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue)            ); break;
			case '$=' : regexp = new RegExp(            escapeRegExp(attributeValue) +'$'       ); break;
			case '~=' : regexp = new RegExp( '(^|\\s)'+ escapeRegExp(attributeValue) +'(\\s|$)' ); break;
			case '|=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue) +'(-|$)'   ); break;
			case  '=' : test = function(value){
				return attributeValue == value;
			}; break;
			case '*=' : test = function(value){
				return value && value.indexOf(attributeValue) > -1;
			}; break;
			case '!=' : test = function(value){
				return attributeValue != value;
			}; break;
			default   : test = function(value){
				return !!value;
			};
		}

		if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function(){
			return false;
		};

		if (!test) test = function(value){
			return value && regexp.test(value);
		};

		if (!currentParsed.attributes) currentParsed.attributes = [];
		currentParsed.attributes.push({
			key: attributeKey,
			operator: attributeOperator,
			value: attributeValue,
			test: test
		});

	}

	return '';
};

// Slick NS

var Slick = (this.Slick || {});

Slick.parse = function(expression){
	return parse(expression);
};

Slick.escapeRegExp = escapeRegExp;

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);

/*
---
name: Slick.Finder
description: The new, superfast css selector engine.
provides: Slick.Finder
requires: Slick.Parser
replaces: Core/Slick.Finder
...
*/

;(function(){

var local = {},
	featuresCache = {},
	toString = Object.prototype.toString;

// Feature / Bug detection

local.isNativeCode = function(fn){
	return (/\{\s*\[native code\]\s*\}/).test('' + fn);
};

local.isXML = function(document){
	return (!!document.xmlVersion) || (!!document.xml) || (toString.call(document) == '[object XMLDocument]') ||
	(document.nodeType == 9 && document.documentElement.nodeName != 'HTML');
};

local.setDocument = function(document){

	// convert elements / window arguments to document. if document cannot be extrapolated, the function returns.
	var nodeType = document.nodeType;
	if (nodeType == 9); // document
	else if (nodeType) document = document.ownerDocument; // node
	else if (document.navigator) document = document.document; // window
	else return;

	// check if it's the old document

	if (this.document === document) return;
	this.document = document;

	// check if we have done feature detection on this document before

	var root = document.documentElement,
		rootUid = this.getUIDXML(root),
		features = document.slickFeatures || featuresCache[rootUid],
		feature;

	if (features){
		for (feature in features){
			this[feature] = features[feature];
		}
		return;
	}

	features = featuresCache[rootUid] = {};

	features.root = root;
	features.isXMLDocument = this.isXML(document);

	features.brokenStarGEBTN
	= features.starSelectsClosedQSA
	= features.idGetsName
	= features.brokenMixedCaseQSA
	= features.brokenGEBCN
	= features.brokenCheckedQSA
	= features.brokenEmptyAttributeQSA
	= features.isHTMLDocument
	= features.nativeMatchesSelector
	= features.findPseudoElement
	= false;

	var starSelectsClosed, starSelectsComments,
		brokenSecondClassNameGEBCN, cachedGetElementsByClassName,
		brokenFormAttributeGetter;

	var selected, id = 'slick_uniqueid';
	var testNode = document.createElement('div');
	
	var testRoot = document.body || document.getElementsByTagName('body')[0] || root;
	testRoot.appendChild(testNode);

	// on non-HTML documents innerHTML and getElementsById doesnt work properly
	try {
		testNode.innerHTML = '<a id="'+id+'"></a>';
		features.isHTMLDocument = !!document.getElementById(id);
	} catch(e){};

	if (features.isHTMLDocument){

		testNode.style.display = 'none';

		// IE returns comment nodes for getElementsByTagName('*') for some documents
		testNode.appendChild(document.createComment(''));
		starSelectsComments = (testNode.getElementsByTagName('*').length > 1);

		// IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
		try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.getElementsByTagName('*');
			starSelectsClosed = (selected && !!selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};

		features.brokenStarGEBTN = starSelectsComments || starSelectsClosed;

		// IE returns elements with the name instead of just id for getElementsById for some documents
		try {
			testNode.innerHTML = '<a name="'+ id +'"></a><b id="'+ id +'"></b>';
			features.idGetsName = document.getElementById(id) === testNode.firstChild;
		} catch(e){};

		if (testNode.getElementsByClassName){

			// Safari 3.2 getElementsByClassName caches results
			try {
				testNode.innerHTML = '<a class="f"></a><a class="b"></a>';
				testNode.getElementsByClassName('b').length;
				testNode.firstChild.className = 'b';
				cachedGetElementsByClassName = (testNode.getElementsByClassName('b').length != 2);
			} catch(e){};

			// Opera 9.6 getElementsByClassName doesnt detects the class if its not the first one
			try {
				testNode.innerHTML = '<a class="a"></a><a class="f b a"></a>';
				brokenSecondClassNameGEBCN = (testNode.getElementsByClassName('a').length != 2);
			} catch(e){};

			features.brokenGEBCN = cachedGetElementsByClassName || brokenSecondClassNameGEBCN;
		}
		
		if (testNode.querySelectorAll){
			// IE 8 returns closed nodes (EG:"</foo>") for querySelectorAll('*') for some documents
			try {
				testNode.innerHTML = 'foo</foo>';
				selected = testNode.querySelectorAll('*');
				features.starSelectsClosedQSA = (selected && !!selected.length && selected[0].nodeName.charAt(0) == '/');
			} catch(e){};

			// Safari 3.2 querySelectorAll doesnt work with mixedcase on quirksmode
			try {
				testNode.innerHTML = '<a class="MiX"></a>';
				features.brokenMixedCaseQSA = !testNode.querySelectorAll('.MiX').length;
			} catch(e){};

			// Webkit and Opera dont return selected options on querySelectorAll
			try {
				testNode.innerHTML = '<select><option selected="selected">a</option></select>';
				features.brokenCheckedQSA = (testNode.querySelectorAll(':checked').length == 0);
			} catch(e){};

			// IE returns incorrect results for attr[*^$]="" selectors on querySelectorAll
			try {
				testNode.innerHTML = '<a class=""></a>';
				features.brokenEmptyAttributeQSA = (testNode.querySelectorAll('[class*=""]').length != 0);
			} catch(e){};

		}

		// IE6-7, if a form has an input of id x, form.getAttribute(x) returns a reference to the input
		try {
			testNode.innerHTML = '<form action="s"><input id="action"/></form>';
			brokenFormAttributeGetter = (testNode.firstChild.getAttribute('action') != 's');
		} catch(e){};

		// native matchesSelector function
		features.nativeMatchesSelector = root.matchesSelector || /*root.msMatchesSelector ||*/ root.mozMatchesSelector || root.webkitMatchesSelector;
		if (features.nativeMatchesSelector) try {
			// if matchesSelector trows errors on incorrect sintaxes we can use it
			features.nativeMatchesSelector.call(root, ':slick');
			features.nativeMatchesSelector = null;
		} catch(e){};

	}

	try {
		root.slick_expando = 1;
		delete root.slick_expando;
		features.getUID = this.getUIDHTML;
	} catch(e) {
		features.getUID = this.getUIDXML;
	}

	testRoot.removeChild(testNode);
	testNode = selected = testRoot = null;

	// getAttribute

	features.getAttribute = (features.isHTMLDocument && brokenFormAttributeGetter) ? function(node, name){
		var method = this.attributeGetters[name];
		if (method) return method.call(node);
		var attributeNode = node.getAttributeNode(name);
		return (attributeNode) ? attributeNode.nodeValue : null;
	} : function(node, name){
		var method = this.attributeGetters[name];
		return (method) ? method.call(node) : node.getAttribute(name);
	};

	// hasAttribute

	features.hasAttribute = (root && this.isNativeCode(root.hasAttribute)) ? function(node, attribute) {
		return node.hasAttribute(attribute);
	} : function(node, attribute) {
		node = node.getAttributeNode(attribute);
		return !!(node && (node.specified || node.nodeValue));
	};

	// contains
	// FIXME: Add specs: local.contains should be different for xml and html documents?
	features.contains = (root && this.isNativeCode(root.contains)) ? function(context, node){
		return context.contains(node);
	} : (root && root.compareDocumentPosition) ? function(context, node){
		return context === node || !!(context.compareDocumentPosition(node) & 16);
	} : function(context, node){
		if (node) do {
			if (node === context) return true;
		} while ((node = node.parentNode));
		return false;
	};

	// document order sorting
	// credits to Sizzle (http://sizzlejs.com/)

	features.documentSorter = (root.compareDocumentPosition) ? function(a, b){
		if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0;
		return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
	} : ('sourceIndex' in root) ? function(a, b){
		if (!a.sourceIndex || !b.sourceIndex) return 0;
		return a.sourceIndex - b.sourceIndex;
	} : (document.createRange) ? function(a, b){
		if (!a.ownerDocument || !b.ownerDocument) return 0;
		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
	} : null ;
	
	// pseudo elements
	
	features.getPseudoElementsByName = function(node, name, value) {
		var value = node[name];
		if (value) {
			var length = value.length;
			if (length == null) return [value];
			for (var i = 0, element, result = []; element = value[i]; i++) result[i] = element;
			return result;
		}
		return [];
	}

	root = null;

	for (feature in features){
		this[feature] = features[feature];
	}
};

// Main Method

var reSimpleSelector = /^([#.]?)((?:[\w-]+|\*))$/,
	reEmptyAttribute = /\[.+[*$^]=(?:""|'')?\]/,
	qsaFailExpCache = {};

local.search = function(context, expression, append, first){

	var found = this.found = (first) ? null : (append || []);
	
	if (!context) return found;
	else if (context.navigator) context = context.document; // Convert the node from a window to a document
	else if (!context.nodeType) return found;

	// setup

	var parsed, i,
		uniques = this.uniques = {},
		hasOthers = !!(append && append.length),
		contextIsDocument = (context.nodeType == 9);

	if (this.document !== (contextIsDocument ? context : context.ownerDocument)) this.setDocument(context);

	// avoid duplicating items already in the append array
	if (hasOthers) for (i = found.length; i--;) uniques[this.getUID(found[i])] = true;

	// expression checks

	if (typeof expression == 'string'){ // expression is a string

		/*<simple-selectors-override>*/
		var simpleSelector = expression.match(reSimpleSelector);
		simpleSelectors: if (simpleSelector) {

			var symbol = simpleSelector[1],
				name = simpleSelector[2],
				node, nodes;

			if (!symbol){

				if (name == '*' && this.brokenStarGEBTN) break simpleSelectors;
				nodes = context.getElementsByTagName(name);
				if (first) return nodes[0] || null;
				for (i = 0; node = nodes[i++];){
					if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
				}

			} else if (symbol == '#'){

				if (!this.isHTMLDocument || !contextIsDocument) break simpleSelectors;
				node = context.getElementById(name);
				if (!node) return found;
				if (this.idGetsName && node.getAttributeNode('id').nodeValue != name) break simpleSelectors;
				if (first) return node || null;
				if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);

			} else if (symbol == '.'){

				if (!this.isHTMLDocument || ((!context.getElementsByClassName || this.brokenGEBCN) && context.querySelectorAll)) break simpleSelectors;
				if (context.getElementsByClassName && !this.brokenGEBCN){
					nodes = context.getElementsByClassName(name);
					if (first) return nodes[0] || null;
					for (i = 0; node = nodes[i++];){
						if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
					}
				} else {
					var matchClass = new RegExp('(^|\\s)'+ Slick.escapeRegExp(name) +'(\\s|$)');
					nodes = context.getElementsByTagName('*');
					for (i = 0; node = nodes[i++];){
						className = node.className;
						if (!(className && matchClass.test(className))) continue;
						if (first) return node;
						if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
					}
				}

			}

			if (hasOthers) this.sort(found);
			return (first) ? null : found;

		}
		/*</simple-selectors-override>*/

		/*<query-selector-override>*/
		querySelector: if (context.querySelectorAll) {
			if (!this.isHTMLDocument
				|| qsaFailExpCache[expression]
				//TODO: only skip when expression is actually mixed case
				|| this.brokenMixedCaseQSA
				|| (this.brokenCheckedQSA && expression.indexOf(':checked') > -1)
				|| (this.brokenEmptyAttributeQSA && reEmptyAttribute.test(expression))
				|| (!contextIsDocument && (//Abort when !contextIsDocument and...
					//  there are multiple expressions in the selector
					//  since we currently only fix non-document rooted QSA for single expression selectors
					expression.indexOf(',') > -1
					//  and the expression begins with a + or ~ combinator
					//  since non-document rooted QSA can't access nodes that aren't descendants of the context
					|| (/^\s*[~+]/).test(expression)
				))
				|| Slick.disableQSA
			) break querySelector;
			var _expression = expression, _context = context;
			if (!contextIsDocument){
				// non-document rooted QSA
				// credits to Andrew Dupont
				var currentId = _context.getAttribute('id'), slickid = 'slickid__';
				_context.setAttribute('id', slickid);
				_expression = '#' + slickid + ' ' + _expression;
				context = _context.parentNode;
			}

			try {
				if (first) return context.querySelector(_expression) || null;
				else nodes = context.querySelectorAll(_expression);
			} catch(e) {
				qsaFailExpCache[expression] = 1;
				break querySelector;
			} finally {
				if (!contextIsDocument){
					if (currentId) _context.setAttribute('id', currentId);
					else _context.removeAttribute('id');
					context = _context;
				}
			}

			if (this.starSelectsClosedQSA) for (i = 0; node = nodes[i++];){
				if (node.nodeName > '@' && !(hasOthers && uniques[this.getUID(node)])) found.push(node);
			} else for (i = 0; node = nodes[i++];){
				if (!(hasOthers && uniques[this.getUID(node)])) found.push(node);
			}

			if (hasOthers) this.sort(found);
			return found;

		}
		/*</query-selector-override>*/

		parsed = this.Slick.parse(expression);
		if (!parsed.length) return found;
	} else if (expression == null){ // there is no expression
		return found;
	} else if (expression.Slick){ // expression is a parsed Slick object
		parsed = expression;
	} else if (this.contains(context.documentElement || context, expression)){ // expression is a node
		(found) ? found.push(expression) : found = expression;
		return found;
	} else { // other junk
		return found;
	}

	/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

	// cache elements for the nth selectors

	this.posNTH = {};
	this.posNTHLast = {};
	this.posNTHType = {};
	this.posNTHTypeLast = {};

	/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

	// if append is null and there is only a single selector with one expression use pushArray, else use pushUID
	this.push = (!hasOthers && (first || (parsed.length == 1 && parsed.expressions[0].length == 1))) ? this.pushArray : this.pushUID;

	if (found == null) found = [];

	// default engine

	var j, m, n;
	var combinator, tag, id, classList, classes, attributes, pseudos;
	var currentItems, currentExpression, currentBit, lastBit, expressions = parsed.expressions;

	search: for (i = 0; (currentExpression = expressions[i]); i++) for (j = 0; (currentBit = currentExpression[j]); j++){

		combinator = 'combinator:' + currentBit.combinator;
		if (!this[combinator]) continue search;

		tag				= (this.isXMLDocument) ? currentBit.tag : currentBit.tag.toUpperCase();
		id				 = currentBit.id;
		classList	= currentBit.classList;
		classes		= currentBit.classes;
		attributes = currentBit.attributes;
		pseudos		= currentBit.pseudos;
		lastBit		= (j === (currentExpression.length - 1));

		this.bitUniques = {};

		if (lastBit){
			this.uniques = uniques;
			this.found = found;
		} else {
			this.uniques = {};
			this.found = [];
		}

		if (j === 0){
			this[combinator](context, tag, id, classes, attributes, pseudos, classList);
			if (first && lastBit && found.length) break search;
		} else {
			if (first && lastBit) for (m = 0, n = currentItems.length; m < n; m++){
				this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
				if (found.length) break search;
			} else for (m = 0, n = currentItems.length; m < n; m++) this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
		}

		currentItems = this.found;
	}

	// should sort if there are nodes in append and if you pass multiple expressions.
	if (hasOthers || (parsed.expressions.length > 1)) this.sort(found);

	return (first) ? (found[0] || null) : found;
};

// Utils

local.uidx = 1;
local.uidk = 'slick-uniqueid';

local.getUIDXML = function(node){
	var uid = node.getAttribute(this.uidk);
	if (!uid){
		uid = this.uidx++;
		node.setAttribute(this.uidk, uid);
	}
	return uid;
};

local.getUIDHTML = function(node){
	return node.uniqueNumber || (node.uniqueNumber = this.uidx++);
};

// sort based on the setDocument documentSorter method.

local.sort = function(results){
	if (!this.documentSorter) return results;
	results.sort(this.documentSorter);
	return results;
};

/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

local.cacheNTH = {};

local.matchNTH = /^([+-]?\d*)?([a-z]+)?([+-]\d+)?$/;

local.parseNTHArgument = function(argument){
	var parsed = argument.match(this.matchNTH);
	if (!parsed) return false;
	var special = parsed[2] || false;
	var a = parsed[1] || 1;
	if (a == '-') a = -1;
	var b = +parsed[3] || 0;
	parsed =
		(special == 'n')	? {a: a, b: b} :
		(special == 'odd')	? {a: 2, b: 1} :
		(special == 'even')	? {a: 2, b: 0} : {a: 0, b: a};

	return (this.cacheNTH[argument] = parsed);
};

local.createNTHPseudo = function(child, sibling, positions, ofType){
	return function(node, argument){
		var uid = this.getUID(node);
		if (!this[positions][uid]){
			var parent = node.parentNode;
			if (!parent) return false;
			var el = parent[child], count = 1;
			if (ofType){
				var nodeName = node.nodeName;
				do {
					if (el.nodeName != nodeName) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			} else {
				do {
					if (el.nodeType != 1) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			}
		}
		argument = argument || 'n';
		var parsed = this.cacheNTH[argument] || this.parseNTHArgument(argument);
		if (!parsed) return false;
		var a = parsed.a, b = parsed.b, pos = this[positions][uid];
		if (a == 0) return b == pos;
		if (a > 0){
			if (pos < b) return false;
		} else {
			if (b < pos) return false;
		}
		return ((pos - b) % a) == 0;
	};
};

/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

local.pushArray = function(node, tag, id, classes, attributes, pseudos){
	var matched = this.matchSelector(node, tag, id, classes, attributes, pseudos);
	if (matched) {
		if (matched === true) this.found.push(node);
		else if (matched.push) this.found.push.apply(this.found, matched);
		return true;
	}
};

local.pushUID = function(node, tag, id, classes, attributes, pseudos){
	var uid = this.getUID(node);
	if (!this.uniques[uid]) {
		var matched = this.matchSelector(node, tag, id, classes, attributes, pseudos);
		if (matched) {
			if (matched === true) {
				this.found.push(node);
				this.uniques[uid] = true;
			} else if (matched.push) {
				for (var i = 0, match; match = matched[i++];) {
					uid = this.getUID(match);
					if (this.uniques[uid]) continue;
					this.uniques[uid] = true;
					this.found.push(match);
				}
			}
			return true;
		}
	}
};

var reSingularCombinator = /^\!?[>+^]$/; // "+", ">", "^"
local.matchNode = function(node, selector, needle){
	if (this.isHTMLDocument && this.nativeMatchesSelector && selector.indexOf){
		try {
			return this.nativeMatchesSelector.call(node, selector.replace(/\[([^=]+)=\s*([^'"\]]+?)\s*\]/g, '[$1="$2"]'));
		} catch(matchError) {}
	}

	var parsed = this.Slick.parse(selector);
	if (!parsed) return true;

	parsed = parsed.reverse();
	for (var i = 0, expression, expressions, built, length, multiple; expression = parsed.expressions[i]; i++) {
		var first = expression[0];
		if (this.matchSelector(node, (this.isXMLDocument) ? first.tag : first.tag.toUpperCase(), first.id, first.classes, first.attributes, first.pseudos)) { // matching first selector against element
			if ((length = expression.length) == (1 + !needle)) continue;
			if (!built) built = {Slick: true, expressions: [], length: 0};
			built.expressions.push(expressions = []);
			built.length++;
			for (var j = 1; j < length; j++) expressions.push(expression[j]);
			if (!multiple) multiple = !expression[expression.length - 1].combinator.match(reSingularCombinator);
		} else return false;
	}
	var found = built ? this.search(node, built, null, !(multiple && needle)) : node;
	return needle ? (multiple ? found.indexOf(needle) > -1 : found == needle) : !!found;
};


local.matchPseudo = function(node, name, argument){
	var pseudoName = 'pseudo:' + name;
	if (this[pseudoName]) return this[pseudoName](node, argument);
	var attribute = this.getAttribute(node, name);
	return (argument) ? argument == attribute : !!attribute;
};

local.matchSelector = function(node, tag, id, classes, attributes, pseudos){
	if (tag){
		var nodeName = (this.isXMLDocument) ? node.nodeName : node.nodeName.toUpperCase();
		if (tag == '*'){
			if (nodeName < '@') return false; // Fix for comment nodes and closed nodes
		} else {
			if (nodeName != tag) return false;
		}
	}

	if (id && node.getAttribute('id') != id) return false;

	var i, part, cls, elements;
	if (classes) for (i = classes.length; i--;){
		cls = node.getAttribute('class') || node.className;
		if (!(cls && classes[i].regexp.test(cls))) return false;
	}
	if (attributes) for (i = attributes.length; i--;){
		part = attributes[i];
		if (part.operator ? !part.test(this.getAttribute(node, part.key)) : !this.hasAttribute(node, part.key)) return false;
	}
	if (pseudos) for (i = 0; part = pseudos[i++];){
		switch(part.type) {
			case 'class':
				if (!this.matchPseudo(node, part.key, part.value)) return false;			
				break;
			case 'element':
				if (elements) {
					for (var j = 0, subelements = [], element; element = elements[j++];) 
						subelements.push.apply(subelements, this.getPseudoElementsByName(element, part.key, part.value));
					elements = subelements;
				} else elements = this.getPseudoElementsByName(node, part.key, part.value);
				if (!elements.length) return false;
		}
	}
	return elements || true;
};

var combinators = {

	' ': function(node, tag, id, classes, attributes, pseudos, classList){ // all child nodes, any level

		var i, item, children;

		if (this.isHTMLDocument){
			getById: if (id){
				item = this.document.getElementById(id);
				if ((!item && node.all) || (this.idGetsName && item && item.getAttributeNode('id').nodeValue != id)){
					// all[id] returns all the elements with that name or id inside node
					// if theres just one it will return the element, else it will be a collection
					children = node.all[id];
					if (!children) return;
					if (!children[0]) children = [children];
					for (i = 0; item = children[i++];){
						var idNode = item.getAttributeNode('id');
						if (idNode && idNode.nodeValue == id){
							this.push(item, tag, null, classes, attributes, pseudos);
							break;
						}
					} 
					return;
				}
				if (!item){
					// if the context is in the dom we return, else we will try GEBTN, breaking the getById label
					if (this.contains(this.root, node)) return;
					else break getById;
				} else if (this.document !== node && !this.contains(node, item)) return;
				this.push(item, tag, null, classes, attributes, pseudos);
				return;
			}
			getByClass: if (classes && node.getElementsByClassName && !this.brokenGEBCN){
				children = node.getElementsByClassName(classList.join(' '));
				if (!(children && children.length)) break getByClass;
				for (i = 0; item = children[i++];) this.push(item, tag, id, null, attributes, pseudos);
				return;
			}
		}
		getByTag: {
			children = node.getElementsByTagName(tag);
			if (!(children && children.length)) break getByTag;
			if (!this.brokenStarGEBTN) tag = null;
			for (i = 0; item = children[i++];) this.push(item, tag, id, classes, attributes, pseudos);
		}
	},

	'>': function(node, tag, id, classes, attributes, pseudos){ // direct children
		if ((node = node.firstChild)) do {
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
		} while ((node = node.nextSibling));
	},

	'+': function(node, tag, id, classes, attributes, pseudos){ // next sibling
		while ((node = node.nextSibling)) if (node.nodeType == 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'^': function(node, tag, id, classes, attributes, pseudos){ // first child
		node = node.firstChild;
		if (node){
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'~': function(node, tag, id, classes, attributes, pseudos){ // next siblings
		while ((node = node.nextSibling)){
			if (node.nodeType != 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	},

	'++': function(node, tag, id, classes, attributes, pseudos){ // next sibling and previous sibling
		this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
	},

	'~~': function(node, tag, id, classes, attributes, pseudos){ // next siblings and previous siblings
		this['combinator:~'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!~'](node, tag, id, classes, attributes, pseudos);
	},

	'!': function(node, tag, id, classes, attributes, pseudos){ // all parent nodes up to document
		while ((node = node.parentNode)) if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!>': function(node, tag, id, classes, attributes, pseudos){ // direct parent (one level)
		node = node.parentNode;
		if (node !== this.document) this.push(node, tag, id, classes, attributes, pseudos);
	},

	'!+': function(node, tag, id, classes, attributes, pseudos){ // previous sibling
		while ((node = node.previousSibling)) if (node.nodeType == 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'!^': function(node, tag, id, classes, attributes, pseudos){ // last child
		node = node.lastChild;
		if (node){
			if (node.nodeType == 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'!~': function(node, tag, id, classes, attributes, pseudos){ // previous siblings
		while ((node = node.previousSibling)){
			if (node.nodeType != 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	}
};

for (var c in combinators) local['combinator:' + c] = combinators[c];

var pseudos = {

	/*<pseudo-selectors>*/

	'empty': function(node){
		var child = node.firstChild;
		return !(child && child.nodeType == 1) && !(node.innerText || node.textContent || '').length;
	},

	'not': function(node, expression){
		return !this.matchNode(node, expression);
	},

	'contains': function(node, text){
		return (node.innerText || node.textContent || '').indexOf(text) > -1;
	},

	'first-child': function(node){
		while ((node = node.previousSibling)) if (node.nodeType == 1) return false;
		return true;
	},

	'last-child': function(node){
		while ((node = node.nextSibling)) if (node.nodeType == 1) return false;
		return true;
	},

	'only-child': function(node){
		var prev = node;
		while ((prev = prev.previousSibling)) if (prev.nodeType == 1) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeType == 1) return false;
		return true;
	},

	/*<nth-pseudo-selectors>*/

	'nth-child': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTH'),

	'nth-last-child': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHLast'),

	'nth-of-type': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTHType', true),

	'nth-last-of-type': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHTypeLast', true),

	'index': function(node, index){
		return this['pseudo:nth-child'](node, '' + index + 1);
	},

	'even': function(node){
		return this['pseudo:nth-child'](node, '2n');
	},

	'odd': function(node){
		return this['pseudo:nth-child'](node, '2n+1');
	},

	/*</nth-pseudo-selectors>*/

	/*<of-type-pseudo-selectors>*/

	'first-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.previousSibling)) if (node.nodeName == nodeName) return false;
		return true;
	},

	'last-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.nextSibling)) if (node.nodeName == nodeName) return false;
		return true;
	},

	'only-of-type': function(node){
		var prev = node, nodeName = node.nodeName;
		while ((prev = prev.previousSibling)) if (prev.nodeName == nodeName) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeName == nodeName) return false;
		return true;
	},

	/*</of-type-pseudo-selectors>*/

	// custom pseudos

	'enabled': function(node){
		return !node.disabled;
	},

	'disabled': function(node){
		return node.disabled;
	},

	'checked': function(node){
		return node.checked || node.selected;
	},

	'focus': function(node){
		return this.isHTMLDocument && this.document.activeElement === node && (node.href || node.type || this.hasAttribute(node, 'tabindex'));
	},

	'root': function(node){
		return (node === this.root);
	},
	
	'selected': function(node){
		return node.selected;
	}

	/*</pseudo-selectors>*/
};

for (var p in pseudos) local['pseudo:' + p] = pseudos[p];

// attributes methods

local.attributeGetters = {

	'class': function(){
		return this.getAttribute('class') || this.className;
	},

	'for': function(){
		return ('htmlFor' in this) ? this.htmlFor : this.getAttribute('for');
	},

	'href': function(){
		return ('href' in this) ? this.getAttribute('href', 2) : this.getAttribute('href');
	},

	'style': function(){
		return (this.style) ? this.style.cssText : this.getAttribute('style');
	},
	
	'tabindex': function(){
		var attributeNode = this.getAttributeNode('tabindex');
		return (attributeNode && attributeNode.specified) ? attributeNode.nodeValue : null;
	},

	'type': function(){
		return this.getAttribute('type');
	}

};

// Slick

var Slick = local.Slick = (this.Slick || {});

Slick.version = '1.1.5';

// Slick finder

Slick.search = function(context, expression, append){
	return local.search(context, expression, append);
};

Slick.find = function(context, expression){
	return local.search(context, expression, null, true);
};

// Slick containment checker

Slick.contains = function(container, node){
	local.setDocument(container);
	return local.contains(container, node);
};

// Slick attribute getter

Slick.getAttribute = function(node, name){
	return local.getAttribute(node, name);
};

// Slick matcher

Slick.match = function(node, selector){
	if (!(node && selector)) return false;
	if (!selector || selector === node) return true;
	local.setDocument(node);
	return local.matchNode(node, selector);
};

// Slick attribute accessor

Slick.defineAttributeGetter = function(name, fn){
	local.attributeGetters[name] = fn;
	return this;
};

Slick.lookupAttributeGetter = function(name){
	return local.attributeGetters[name];
};

// Slick pseudo accessor

Slick.defineCombinator = function(name, fn){
	local['combinator:' + name] = function(node, argument){
		return fn.apply(this, arguments);
	};
	return this;
};

Slick.lookupCombinator = function(name){
	var combinator = local['combinator:' + name];
	if (combinator) return function(argument){
		return combinator.call(this, argument);
	};
	return null;
};


// Slick pseudo accessor

Slick.definePseudo = function(name, fn){
	local['pseudo:' + name] = function(node, argument){
		return fn.call(node, argument);
	};
	return this;
};

Slick.lookupPseudo = function(name){
	var pseudo = local['pseudo:' + name];
	if (pseudo) return function(argument){
		return pseudo.call(this, argument);
	};
	return null;
};

// Slick overrides accessor

Slick.override = function(regexp, fn){
	local.override(regexp, fn);
	return this;
};

Slick.isXML = local.isXML;

Slick.uidOf = function(node){
	return local.getUIDHTML(node);
};

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);

/*
---
 
script: Selectors.js
 
description: Define a widget associations
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Slick.Finder

provides: 
  - LSD.Module.Selectors

...
*/

!function() {

LSD.Module.Selectors = new Class({
  getElements: function(selector, origin) {
    return Slick.search(origin || this.getSelectorOrigin(selector), selector)
  },
  
  getElement: function(selector, origin) {
    return Slick.find(origin || this.getSelectorOrigin(selector), selector)
  },
  
  // we have to figure the document before we do a .search  
  getSelectorOrigin: function(selector) {
    if (!selector.Slick) selector = Slick.parse(selector);
    var first = selector.expressions[0][0];
    switch (first.combinator) {
      case "$": case "$$":
        return this.element;
      case "&": case "&&": default:
        return this;
    }
  }
});

var Combinators = LSD.Module.Selectors.Combinators = {
  '$': function(node, tag, id, classes, attributes, pseudos) { //this element
    return this.push(node, tag, id, classes, attributes, pseudos)
  },

  '$$': function(node, tag, id, classes, attributes, pseudos) { //this element document
    if ((tag == '*') && !id && !classes && !attributes) return this.push(this.document.body, null, null, null, null, pseudos);
    else return this['combinator: '](this.document.body, tag, id, classes, attributes, pseudos);
  }
};

Combinators['&'] = Combinators['$'];
Combinators['&&'] = Combinators['$$'];

for (name in Combinators) Slick.defineCombinator(name, Combinators[name])

LSD.Module.Selectors.Features = {
  brokenStarGEBTN: false,
  starSelectsClosedQSA: false,
  idGetsName: false,
  brokenMixedCaseQSA: false,
  brokenGEBCN: false,
  brokenCheckedQSA: false,
  brokenEmptyAttributeQSA: false,
  isHTMLDocument: false,
  nativeMatchesSelector: false,
  hasAttribute: function(node, attribute) {
    return (attribute in node.attributes) || ((attribute in node.$states) && (attribute in node.pseudos))
  },
  getAttribute: function(node, attribute) {
    return node.attributes[attribute] || ((attribute in node.$states) || node.pseudos[attribute]);
  },
  getPseudoElementsByName: function(node, name, value) {
    var collection = node[name];
    return collection ? (collection.push ? collection : [collection]) : [];
  }
};

}();
/*
---
name: Slick.Parser
description: Standalone CSS3 Selector parser
provides: Slick.Parser
...
*/

;(function(){

var parsed,
	separatorIndex,
	combinatorIndex,
	reversed,
	cache = {},
	reverseCache = {},
	reUnescape = /\\/g;

var parse = function(expression, isReversed){
	if (expression == null) return null;
	if (expression.Slick === true) return expression;
	expression = ('' + expression).replace(/^\s+|\s+$/g, '');
	reversed = !!isReversed;
	var currentCache = (reversed) ? reverseCache : cache;
	if (currentCache[expression]) return currentCache[expression];
	parsed = {
		Slick: true,
		expressions: [],
		raw: expression,
		reverse: function(){
			return parse(this.raw, true);
		}
	};
	separatorIndex = -1;
	while (expression != (expression = expression.replace(regexp, parser)));
	parsed.length = parsed.expressions.length;
	return currentCache[parsed.raw] = (reversed) ? reverse(parsed) : parsed;
};

var reverseCombinator = function(combinator){
	if (combinator === '!') return ' ';
	else if (combinator === ' ') return '!';
	else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
	else return '!' + combinator;
};

var reverse = function(expression){
	var expressions = expression.expressions;
	for (var i = 0; i < expressions.length; i++){
		var exp = expressions[i];
		var last = {parts: [], tag: '*', combinator: reverseCombinator(exp[0].combinator)};

		for (var j = 0; j < exp.length; j++){
			var cexp = exp[j];
			if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
			cexp.combinator = cexp.reverseCombinator;
			delete cexp.reverseCombinator;
		}

		exp.reverse().push(last);
	}
	return expression;
};

var escapeRegExp = function(string){// Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
	return string.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, function(match){
		return '\\' + match;
	});
};

var regexp = new RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
	"(?x)^(?:\
	  \\s* ( , ) \\s*               # Separator          \n\
	| \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
	|      ( \\s+ )                 # CombinatorChildren \n\
	|      ( <unicode>+ | \\* )     # Tag                \n\
	| \\#  ( <unicode>+       )     # ID                 \n\
	| \\.  ( <unicode>+       )     # ClassName          \n\
	|                               # Attribute          \n\
	\\[  \
		\\s* (<unicode1>+)  (?:  \
			\\s* ([*^$!~|]?=)  (?:  \
				\\s* (?:\
					([\"']?)(.*?)\\9 \
				)\
			)  \
		)?  \\s*  \
	\\](?!\\]) \n\
	|   :+ ( <unicode>+ )(?:\
	\\( (?:\
		(?:([\"'])([^\\12]*)\\12)|((?:\\([^)]+\\)|[^()]*)+)\
	) \\)\
	)?\
	)"
*/
	"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:([\"'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)"
	.replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
	.replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
	.replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
);

function parser(
	rawMatch,

	separator,
	combinator,
	combinatorChildren,

	tagName,
	id,
	className,

	attributeKey,
	attributeOperator,
	attributeQuote,
	attributeValue,

	pseudoMarker,
	pseudoClass,
	pseudoQuote,
	pseudoClassQuotedValue,
	pseudoClassValue
){
	if (separator || separatorIndex === -1){
		parsed.expressions[++separatorIndex] = [];
		combinatorIndex = -1;
		if (separator) return '';
	}

	if (combinator || combinatorChildren || combinatorIndex === -1){
		combinator = combinator || ' ';
		var currentSeparator = parsed.expressions[separatorIndex];
		if (reversed && currentSeparator[combinatorIndex])
			currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
		currentSeparator[++combinatorIndex] = {combinator: combinator, tag: '*'};
	}

	var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

	if (tagName){
		currentParsed.tag = tagName.replace(reUnescape, '');

	} else if (id){
		currentParsed.id = id.replace(reUnescape, '');

	} else if (className){
		className = className.replace(reUnescape, '');

		if (!currentParsed.classList) currentParsed.classList = [];
		if (!currentParsed.classes) currentParsed.classes = [];
		currentParsed.classList.push(className);
		currentParsed.classes.push({
			value: className,
			regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
		});

	} else if (pseudoClass){
		pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
		pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;

		if (!currentParsed.pseudos) currentParsed.pseudos = [];
		currentParsed.pseudos.push({
			key: pseudoClass.replace(reUnescape, ''),
			value: pseudoClassValue,
			type: pseudoMarker.length == 1 ? 'class' : 'element'
		});

	} else if (attributeKey){
		attributeKey = attributeKey.replace(reUnescape, '');
		attributeValue = (attributeValue || '').replace(reUnescape, '');

		var test, regexp;

		switch (attributeOperator){
			case '^=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue)            ); break;
			case '$=' : regexp = new RegExp(            escapeRegExp(attributeValue) +'$'       ); break;
			case '~=' : regexp = new RegExp( '(^|\\s)'+ escapeRegExp(attributeValue) +'(\\s|$)' ); break;
			case '|=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue) +'(-|$)'   ); break;
			case  '=' : test = function(value){
				return attributeValue == value;
			}; break;
			case '*=' : test = function(value){
				return value && value.indexOf(attributeValue) > -1;
			}; break;
			case '!=' : test = function(value){
				return attributeValue != value;
			}; break;
			default   : test = function(value){
				return !!value;
			};
		}

		if (attributeValue == '' && (/^[*$^]=$/).test(attributeOperator)) test = function(){
			return false;
		};

		if (!test) test = function(value){
			return value && regexp.test(value);
		};

		if (!currentParsed.attributes) currentParsed.attributes = [];
		currentParsed.attributes.push({
			key: attributeKey,
			operator: attributeOperator,
			value: attributeValue,
			test: test
		});

	}

	return '';
};

// Slick NS

var Slick = (this.Slick || {});

Slick.parse = function(expression){
	return parse(expression);
};

Slick.escapeRegExp = escapeRegExp;

if (!this.Slick) this.Slick = Slick;

}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);

/*
---
 
script: Attributes.js
 
description: A mixin that adds support for setting attributes, adding and removing classes and pseudos
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Slick.Parser
 
provides: 
  - LSD.Module.Attributes
 
...
*/

LSD.Module.Attributes = new Class({
  initializers: {
    attributes: function() {
      this.classes = new FastArray;
      this.pseudos = new FastArray;
      this.attributes = {};
    }
  },
  
  getAttribute: function(attribute) {
    switch (attribute) {
      case "class":           return this.classes.join(' ');
      case "slick-uniqueid":  return this.lsd;
      default:                return this.attributes[attribute];
    }
  },
  
  removeAttribute: function(attribute) {
    this.fireEvent('selectorChange', ['attributes', name, false]);
    delete this.attributes[attribute];
    if (this.element) this.element.removeAttribute(attribute);
  },

  setAttribute: function(name, value) {
    if (LSD.Attributes.Numeric[name]) value = value.toInt();
    else {
      var logic = LSD.Attributes.Setter[name];
      if (logic) logic.call(this, value)
    }
    this.fireEvent('selectorChange', ['attributes', name, false]);
    this.attributes[name] = value;    
    this.fireEvent('selectorChange', ['attributes', name, true]);
    if (this.element) this.element.setAttribute(name, value);
  },

  addPseudo: function(name){
    this.pseudos.include(name);
    this.fireEvent('selectorChange', ['pseudos', name, true]);
  },

  removePseudo: function(name){
    this.fireEvent('selectorChange', ['pseudos', name, false]);
    this.pseudos.erase(name);
  },

  addClass: function(name) {
    this.classes.include(name);
    if (this.element) this.element.addClass(name);
    this.fireEvent('selectorChange', ['classes', name, true]);
  },

  removeClass: function(name) {
    this.fireEvent('selectorChange', ['classes', name, false]);
    var state = LSD.States.Classes[name];
    if (state) this.pseudos.erase(state)
    this.classes.erase(name);
    if (this.element) this.element.removeClass(name);
  },
  
  hasClass: function(name) {
    return this.classes[name]
  },
  
  setState: function(state) {
    var attribute = LSD.States.Attributes[state];
    if (attribute) this.setAttribute(attribute, attribute)
    else this.addClass(LSD.States.Classes[state] || 'is-' + state);
    this.addPseudo(state);
  },
  
  unsetState: function(state) {
    var attribute = LSD.States.Attributes[state];
    if (attribute) this.removeAttribute(attribute);
    else this.removeClass(LSD.States.Classes[state] || 'is-' + state);
    this.removePseudo(state);
  },
  
  getSelector: function(){
    var parent = this.parentNode;
    var selector = (parent && parent.getSelector) ? parent.getSelector() + ' ' : '';
    selector += this.options.tag;
    if (this.attributes.id) selector += '#' + this.attributes.id;
    for (var klass in this.classes)  if (this.classes.hasOwnProperty(klass))  selector += '.' + klass;
    for (var pseudo in this.pseudos) if (this.pseudos.hasOwnProperty(pseudo)) selector += ':' + pseudo;
    for (var name in this.attributes) if (name != 'id') selector += '[' + name + '=' + this.attributes[name] + ']';
    return selector;
  }
});


LSD.Attributes.Setter = {
  'id': function(id) {
    this.id = id;
  },
  'class': function(value) {
    value.split(' ').each(this.addClass.bind(this));
  },
  'style': function(value) {
    value.split(/\s*;\s*/).each(function(definition) {
      var bits = definition.split(/\s*:\s*/)
      if (!bits[1]) return;
      bits[0] = bits[0].camelCase();
      var integer = bits[1].toInt();
      if (bits[1].indexOf('px') > -1 || (integer == bits[1])) bits[1] = integer
      //this.setStyle.apply(this, bits);
    }, this);
  }
};

Object.append(LSD.Options, {
  attributes: {
    add: 'setAttribute',
    remove: 'removeAttribute',
    iterate: true
  },
  classes: {
    add: function(name) {
      this[LSD.States.Classes[name] ? 'addPseudo' : 'addClass'](name);
    },
    remove: function(name) {
      this[LSD.States.Classes[name] ? 'removePseudo' : 'removeClass'](name);
    },
    iterate: true
  },
  pseudos: {
    add: function(name) {
      if (this.$states[name]) this.setStateTo(name, true);
      else this.addPseudo(name);
    },
    remove: function(name) {
      if (this.$states[name]) this.setStateTo(name, false);
      else this.removePseudo(name);
    },
    iterate: true
  }
});

/*
---

name: Element

description: One of the most important items in MooTools. Contains the dollar function, the dollars function, and an handful of cross-browser, time-saver methods to let you easily work with HTML Elements.

license: MIT-style license.

requires: [Window, Document, Array, String, Function, Number, Slick.Parser, Slick.Finder]

provides: [Element, Elements, $, $$, Iframe, Selectors]

...
*/

var Element = function(tag, props){
	var konstructor = Element.Constructors[tag];
	if (konstructor) return konstructor(props);
	if (typeof tag != 'string') return document.id(tag).set(props);

	if (!props) props = {};

	if (!(/^[\w-]+$/).test(tag)){
		var parsed = Slick.parse(tag).expressions[0][0];
		tag = (parsed.tag == '*') ? 'div' : parsed.tag;
		if (parsed.id && props.id == null) props.id = parsed.id;

		var attributes = parsed.attributes;
		if (attributes) for (var attr, i = 0, l = attributes.length; i < l; i++){
			attr = attributes[i];
			if (props[attr.key] != null) continue;

			if (attr.value != null && attr.operator == '=') props[attr.key] = attr.value;
			else if (!attr.value && !attr.operator) props[attr.key] = true;
		}

		if (parsed.classList && props['class'] == null) props['class'] = parsed.classList.join(' ');
	}

	return document.newElement(tag, props);
};

if (Browser.Element) Element.prototype = Browser.Element.prototype;

new Type('Element', Element).mirror(function(name){
	if (Array.prototype[name]) return;

	var obj = {};
	obj[name] = function(){
		var results = [], args = arguments, elements = true;
		for (var i = 0, l = this.length; i < l; i++){
			var element = this[i], result = results[i] = element[name].apply(element, args);
			elements = (elements && typeOf(result) == 'element');
		}
		return (elements) ? new Elements(results) : results;
	};

	Elements.implement(obj);
});

if (!Browser.Element){
	Element.parent = Object;

	Element.Prototype = {'$family': Function.from('element').hide()};

	Element.mirror(function(name, method){
		Element.Prototype[name] = method;
	});
}

Element.Constructors = {};

//<1.2compat>

Element.Constructors = new Hash;

//</1.2compat>

var IFrame = new Type('IFrame', function(){
	var params = Array.link(arguments, {
		properties: Type.isObject,
		iframe: function(obj){
			return (obj != null);
		}
	});

	var props = params.properties || {}, iframe;
	if (params.iframe) iframe = document.id(params.iframe);
	var onload = props.onload || function(){};
	delete props.onload;
	props.id = props.name = [props.id, props.name, iframe ? (iframe.id || iframe.name) : 'IFrame_' + String.uniqueID()].pick();
	iframe = new Element(iframe || 'iframe', props);

	var onLoad = function(){
		onload.call(iframe.contentWindow);
	};

	if (window.frames[props.id]) onLoad();
	else iframe.addListener('load', onLoad);
	return iframe;
});

var Elements = this.Elements = function(nodes){
	if (nodes && nodes.length){
		var uniques = {}, node;
		for (var i = 0; node = nodes[i++];){
			var uid = Slick.uidOf(node);
			if (!uniques[uid]){
				uniques[uid] = true;
				this.push(node);
			}
		}
	}
};

Elements.prototype = {length: 0};
Elements.parent = Array;

new Type('Elements', Elements).implement({

	filter: function(filter, bind){
		if (!filter) return this;
		return new Elements(Array.filter(this, (typeOf(filter) == 'string') ? function(item){
			return item.match(filter);
		} : filter, bind));
	}.protect(),

	push: function(){
		var length = this.length;
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) this[length++] = item;
		}
		return (this.length = length);
	}.protect(),

	unshift: function(){
		var items = [];
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) items.push(item);
		}
		return Array.prototype.unshift.apply(this, items);
	}.protect(),

	concat: function(){
		var newElements = new Elements(this);
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = arguments[i];
			if (Type.isEnumerable(item)) newElements.append(item);
			else newElements.push(item);
		}
		return newElements;
	}.protect(),

	append: function(collection){
		for (var i = 0, l = collection.length; i < l; i++) this.push(collection[i]);
		return this;
	}.protect(),

	empty: function(){
		while (this.length) delete this[--this.length];
		return this;
	}.protect()

});

//<1.2compat>

Elements.alias('extend', 'append');

//</1.2compat>

(function(){

// FF, IE
var splice = Array.prototype.splice, object = {'0': 0, '1': 1, length: 2};

splice.call(object, 1, 1);
if (object[1] == 1) Elements.implement('splice', function(){
	var length = this.length;
	splice.apply(this, arguments);
	while (length >= this.length) delete this[length--];
	return this;
}.protect());

Elements.implement(Array.prototype);

Array.mirror(Elements);

/*<ltIE8>*/
var createElementAcceptsHTML;
try {
	var x = document.createElement('<input name=x>');
	createElementAcceptsHTML = (x.name == 'x');
} catch(e){}

var escapeQuotes = function(html){
	return ('' + html).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};
/*</ltIE8>*/

Document.implement({

	newElement: function(tag, props){
		if (props && props.checked != null) props.defaultChecked = props.checked;
		/*<ltIE8>*/// Fix for readonly name and type properties in IE < 8
		if (createElementAcceptsHTML && props){
			tag = '<' + tag;
			if (props.name) tag += ' name="' + escapeQuotes(props.name) + '"';
			if (props.type) tag += ' type="' + escapeQuotes(props.type) + '"';
			tag += '>';
			delete props.name;
			delete props.type;
		}
		/*</ltIE8>*/
		return this.id(this.createElement(tag)).set(props);
	}

});

})();

Document.implement({

	newTextNode: function(text){
		return this.createTextNode(text);
	},

	getDocument: function(){
		return this;
	},

	getWindow: function(){
		return this.window;
	},

	id: (function(){

		var types = {

			string: function(id, nocash, doc){
				id = Slick.find(doc, '#' + id.replace(/(\W)/g, '\\$1'));
				return (id) ? types.element(id, nocash) : null;
			},

			element: function(el, nocash){
				$uid(el);
				if (!nocash && !el.$family && !(/^(?:object|embed)$/i).test(el.tagName)){
					Object.append(el, Element.Prototype);
				}
				return el;
			},

			object: function(obj, nocash, doc){
				if (obj.toElement) return types.element(obj.toElement(doc), nocash);
				return null;
			}

		};

		types.textnode = types.whitespace = types.window = types.document = function(zero){
			return zero;
		};

		return function(el, nocash, doc){
			if (el && el.$family && el.uid) return el;
			var type = typeOf(el);
			return (types[type]) ? types[type](el, nocash, doc || document) : null;
		};

	})()

});

if (window.$ == null) Window.implement('$', function(el, nc){
	return document.id(el, nc, this.document);
});

Window.implement({

	getDocument: function(){
		return this.document;
	},

	getWindow: function(){
		return this;
	}

});

[Document, Element].invoke('implement', {

	getElements: function(expression){
		return Slick.search(this, expression, new Elements);
	},

	getElement: function(expression){
		return document.id(Slick.find(this, expression));
	}

});

//<1.2compat>

(function(search, find, match){

	this.Selectors = {};
	var pseudos = this.Selectors.Pseudo = new Hash();

	var addSlickPseudos = function(){
		for (var name in pseudos) if (pseudos.hasOwnProperty(name)){
			Slick.definePseudo(name, pseudos[name]);
			delete pseudos[name];
		}
	};

	Slick.search = function(context, expression, append){
		addSlickPseudos();
		return search.call(this, context, expression, append);
	};

	Slick.find = function(context, expression){
		addSlickPseudos();
		return find.call(this, context, expression);
	};

	Slick.match = function(node, selector){
		addSlickPseudos();
		return match.call(this, node, selector);
	};

})(Slick.search, Slick.find, Slick.match);

if (window.$$ == null) Window.implement('$$', function(selector){
	var elements = new Elements;
	if (arguments.length == 1 && typeof selector == 'string') return Slick.search(this.document, selector, elements);
	var args = Array.flatten(arguments);
	for (var i = 0, l = args.length; i < l; i++){
		var item = args[i];
		switch (typeOf(item)){
			case 'element': elements.push(item); break;
			case 'string': Slick.search(this.document, item, elements);
		}
	}
	return elements;
});

//</1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	if (arguments.length == 1){
		if (typeof selector == 'string') return Slick.search(this.document, selector, new Elements);
		else if (Type.isEnumerable(selector)) return new Elements(selector);
	}
	return new Elements(arguments);
});

(function(){

var collected = {}, storage = {};
var formProps = {input: 'checked', option: 'selected', textarea: 'value'};

var get = function(uid){
	return (storage[uid] || (storage[uid] = {}));
};

var clean = function(item){
	var uid = item.uid;
	if (item.removeEvents) item.removeEvents();
	if (item.clearAttributes) item.clearAttributes();
	if (uid != null){
		delete collected[uid];
		delete storage[uid];
	}
	return item;
};

var camels = ['defaultValue', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan', 'frameBorder', 'maxLength', 'readOnly',
	'rowSpan', 'tabIndex', 'useMap'
];
var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked', 'disabled', 'readOnly', 'multiple', 'selected',
	'noresize', 'defer', 'defaultChecked'
];
 var attributes = {
	'html': 'innerHTML',
	'class': 'className',
	'for': 'htmlFor',
	'text': (function(){
		var temp = document.createElement('div');
		return (temp.textContent == null) ? 'innerText' : 'textContent';
	})()
};
var readOnly = ['type'];
var expandos = ['value', 'defaultValue'];
var uriAttrs = /^(?:href|src|usemap)$/i;

bools = bools.associate(bools);
camels = camels.associate(camels.map(String.toLowerCase));
readOnly = readOnly.associate(readOnly);

Object.append(attributes, expandos.associate(expandos));

var inserters = {

	before: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element);
	},

	after: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element.nextSibling);
	},

	bottom: function(context, element){
		element.appendChild(context);
	},

	top: function(context, element){
		element.insertBefore(context, element.firstChild);
	}

};

inserters.inside = inserters.bottom;

//<1.2compat>

Object.each(inserters, function(inserter, where){

	where = where.capitalize();

	var methods = {};

	methods['inject' + where] = function(el){
		inserter(this, document.id(el, true));
		return this;
	};

	methods['grab' + where] = function(el){
		inserter(document.id(el, true), this);
		return this;
	};

	Element.implement(methods);

});

//</1.2compat>

var injectCombinator = function(expression, combinator){
	if (!expression) return combinator;

	expression = Object.clone(Slick.parse(expression));

	var expressions = expression.expressions;
	for (var i = expressions.length; i--;)
		expressions[i][0].combinator = combinator;

	return expression;
};

Element.implement({

	set: function(prop, value){
		var property = Element.Properties[prop];
		(property && property.set) ? property.set.call(this, value) : this.setProperty(prop, value);
	}.overloadSetter(),

	get: function(prop){
		var property = Element.Properties[prop];
		return (property && property.get) ? property.get.apply(this) : this.getProperty(prop);
	}.overloadGetter(),

	erase: function(prop){
		var property = Element.Properties[prop];
		(property && property.erase) ? property.erase.apply(this) : this.removeProperty(prop);
		return this;
	},

	setProperty: function(attribute, value){
		attribute = camels[attribute] || attribute;
		if (value == null) return this.removeProperty(attribute);
		var key = attributes[attribute];
		(key) ? this[key] = value :
			(bools[attribute]) ? this[attribute] = !!value : this.setAttribute(attribute, '' + value);
		return this;
	},

	setProperties: function(attributes){
		for (var attribute in attributes) this.setProperty(attribute, attributes[attribute]);
		return this;
	},

	getProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute] || readOnly[attribute];
		return (key) ? this[key] :
			(bools[attribute]) ? !!this[attribute] :
			(uriAttrs.test(attribute) ? this.getAttribute(attribute, 2) :
			(key = this.getAttributeNode(attribute)) ? key.nodeValue : null) || null;
	},

	getProperties: function(){
		var args = Array.from(arguments);
		return args.map(this.getProperty, this).associate(args);
	},

	removeProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute];
		(key) ? this[key] = '' :
			(bools[attribute]) ? this[attribute] = false : this.removeAttribute(attribute);
		return this;
	},

	removeProperties: function(){
		Array.each(arguments, this.removeProperty, this);
		return this;
	},

	hasClass: function(className){
		return this.className.clean().contains(className, ' ');
	},

	addClass: function(className){
		if (!this.hasClass(className)) this.className = (this.className + ' ' + className).clean();
		return this;
	},

	removeClass: function(className){
		this.className = this.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
		return this;
	},

	toggleClass: function(className, force){
		if (force == null) force = !this.hasClass(className);
		return (force) ? this.addClass(className) : this.removeClass(className);
	},

	adopt: function(){
		var parent = this, fragment, elements = Array.flatten(arguments), length = elements.length;
		if (length > 1) parent = fragment = document.createDocumentFragment();

		for (var i = 0; i < length; i++){
			var element = document.id(elements[i], true);
			if (element) parent.appendChild(element);
		}

		if (fragment) this.appendChild(fragment);

		return this;
	},

	appendText: function(text, where){
		return this.grab(this.getDocument().newTextNode(text), where);
	},

	grab: function(el, where){
		inserters[where || 'bottom'](document.id(el, true), this);
		return this;
	},

	inject: function(el, where){
		inserters[where || 'bottom'](this, document.id(el, true));
		return this;
	},

	replaces: function(el){
		el = document.id(el, true);
		el.parentNode.replaceChild(this, el);
		return this;
	},

	wraps: function(el, where){
		el = document.id(el, true);
		return this.replaces(el).grab(el, where);
	},

	getPrevious: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '!~')));
	},

	getAllPrevious: function(expression){
		return Slick.search(this, injectCombinator(expression, '!~'), new Elements);
	},

	getNext: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '~')));
	},

	getAllNext: function(expression){
		return Slick.search(this, injectCombinator(expression, '~'), new Elements);
	},

	getFirst: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>'))[0]);
	},

	getLast: function(expression){
		return document.id(Slick.search(this, injectCombinator(expression, '>')).getLast());
	},

	getParent: function(expression){
		return document.id(Slick.find(this, injectCombinator(expression, '!')));
	},

	getParents: function(expression){
		return Slick.search(this, injectCombinator(expression, '!'), new Elements);
	},

	getSiblings: function(expression){
		return Slick.search(this, injectCombinator(expression, '~~'), new Elements);
	},

	getChildren: function(expression){
		return Slick.search(this, injectCombinator(expression, '>'), new Elements);
	},

	getWindow: function(){
		return this.ownerDocument.window;
	},

	getDocument: function(){
		return this.ownerDocument;
	},

	getElementById: function(id){
		return document.id(Slick.find(this, '#' + ('' + id).replace(/(\W)/g, '\\$1')));
	},

	getSelected: function(){
		this.selectedIndex; // Safari 3.2.1
		return new Elements(Array.from(this.options).filter(function(option){
			return option.selected;
		}));
	},

	toQueryString: function(){
		var queryString = [];
		this.getElements('input, select, textarea').each(function(el){
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

			var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
				// IE
				return document.id(opt).get('value');
			}) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');

			Array.from(value).each(function(val){
				if (typeof val != 'undefined') queryString.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(val));
			});
		});
		return queryString.join('&');
	},

	destroy: function(){
		var children = clean(this).getElementsByTagName('*');
		Array.each(children, clean);
		Element.dispose(this);
		return null;
	},

	empty: function(){
		Array.from(this.childNodes).each(Element.dispose);
		return this;
	},

	dispose: function(){
		return (this.parentNode) ? this.parentNode.removeChild(this) : this;
	},

	match: function(expression){
		return !expression || Slick.match(this, expression);
	}

});

var cleanClone = function(node, element, keepid){
	if (!keepid) node.setAttributeNode(document.createAttribute('id'));
	if (node.clearAttributes){
		node.clearAttributes();
		node.mergeAttributes(element);
		node.removeAttribute('uid');
		if (node.options){
			var no = node.options, eo = element.options;
			for (var i = no.length; i--;) no[i].selected = eo[i].selected;
		}
	}

	var prop = formProps[element.tagName.toLowerCase()];
	if (prop && element[prop]) node[prop] = element[prop];
};

Element.implement('clone', function(contents, keepid){
	contents = contents !== false;
	var clone = this.cloneNode(contents), i;

	if (contents){
		var ce = clone.getElementsByTagName('*'), te = this.getElementsByTagName('*');
		for (i = ce.length; i--;) cleanClone(ce[i], te[i], keepid);
	}

	cleanClone(clone, this, keepid);

	if (Browser.ie){
		var co = clone.getElementsByTagName('object'), to = this.getElementsByTagName('object');
		for (i = co.length; i--;) co[i].outerHTML = to[i].outerHTML;
	}
	return document.id(clone);
});

var contains = {contains: function(element){
	return Slick.contains(this, element);
}};

if (!document.contains) Document.implement(contains);
if (!document.createElement('div').contains) Element.implement(contains);

//<1.2compat>

Element.implement('hasChild', function(element){
	return this !== element && this.contains(element);
});

//</1.2compat>

[Element, Window, Document].invoke('implement', {

	addListener: function(type, fn){
		if (type == 'unload'){
			var old = fn, self = this;
			fn = function(){
				self.removeListener('unload', fn);
				old();
			};
		} else {
			collected[$uid(this)] = this;
		}
		if (this.addEventListener) this.addEventListener(type, fn, !!arguments[2]);
		else this.attachEvent('on' + type, fn);
		return this;
	},

	removeListener: function(type, fn){
		if (this.removeEventListener) this.removeEventListener(type, fn, !!arguments[2]);
		else this.detachEvent('on' + type, fn);
		return this;
	},

	retrieve: function(property, dflt){
		var storage = get($uid(this)), prop = storage[property];
		if (dflt != null && prop == null) prop = storage[property] = dflt;
		return prop != null ? prop : null;
	},

	store: function(property, value){
		var storage = get($uid(this));
		storage[property] = value;
		return this;
	},

	eliminate: function(property){
		var storage = get($uid(this));
		delete storage[property];
		return this;
	}

});

/*<ltIE9>*/
if (window.attachEvent && !window.addEventListener) window.addListener('unload', function(){
	Object.each(collected, clean);
	if (window.CollectGarbage) CollectGarbage();
});
/*</ltIE9>*/

})();

Element.Properties = {};

//<1.2compat>

Element.Properties = new Hash;

//</1.2compat>

Element.Properties.style = {

	set: function(style){
		this.style.cssText = style;
	},

	get: function(){
		return this.style.cssText;
	},

	erase: function(){
		this.style.cssText = '';
	}

};

Element.Properties.tag = {

	get: function(){
		return this.tagName.toLowerCase();
	}

};

/*<ltIE9>*/
(function(maxLength){
	if (maxLength != null) Element.Properties.maxlength = Element.Properties.maxLength = {
		get: function(){
			var maxlength = this.getAttribute('maxLength');
			return maxlength == maxLength ? null : maxlength;
		}
	};
})(document.createElement('input').getAttribute('maxLength'));
/*</ltIE9>*/

/*<!webkit>*/
Element.Properties.html = (function(){

	var tableTest = Function.attempt(function(){
		var table = document.createElement('table');
		table.innerHTML = '<tr><td></td></tr>';
	});

	var wrapper = document.createElement('div');

	var translations = {
		table: [1, '<table>', '</table>'],
		select: [1, '<select>', '</select>'],
		tbody: [2, '<table><tbody>', '</tbody></table>'],
		tr: [3, '<table><tbody><tr>', '</tr></tbody></table>']
	};
	translations.thead = translations.tfoot = translations.tbody;

	var html = {
		set: function(){
			var html = Array.flatten(arguments).join('');
			var wrap = (!tableTest && translations[this.get('tag')]);
			if (wrap){
				var first = wrapper;
				first.innerHTML = wrap[1] + html + wrap[2];
				for (var i = wrap[0]; i--;) first = first.firstChild;
				this.empty().adopt(first.childNodes);
			} else {
				this.innerHTML = html;
			}
		}
	};

	html.erase = html.set;

	return html;
})();
/*</!webkit>*/

/*
---
 
script: Element.onDispose.js
 
description: Fires event when element is destroyed
 
license: MIT-style license.

extends: Core/Element
 
...
*/

!function(dispose) { 
  Element.implement({
    dispose: function() {
      if (this.fireEvent) this.fireEvent('dispose', this.parentNode);
  		return (this.parentNode) ? this.parentNode.removeChild(this) : this;
    },
    
    replaces: function(el) {
      el = document.id(el, true);
      var parent = el.parentNode;
      if (el.fireEvent) el.fireEvent('dispose', parent);
  		parent.replaceChild(this, el);
  		return this;
    }
  });
  Element.dispose = function(element) {
    return Element.prototype.dispose.call(element);
  }
  Element.replaces = function(element, el) {
    return Element.prototype.dispose.call(element, el);
  }
}(Element.prototype.dispose, Element.prototype.replaces);
/*
---

name: Element.Event

description: Contains Element methods for dealing with events. This file also includes mouseenter and mouseleave custom Element Events.

license: MIT-style license.

requires: [Element, Event]

provides: Element.Event

...
*/

(function(){

Element.Properties.events = {set: function(events){
	this.addEvents(events);
}};

[Element, Window, Document].invoke('implement', {

	addEvent: function(type, fn){
		var events = this.retrieve('events', {});
		if (!events[type]) events[type] = {keys: [], values: []};
		if (events[type].keys.contains(fn)) return this;
		events[type].keys.push(fn);
		var realType = type,
			custom = Element.Events[type],
			condition = fn,
			self = this;
		if (custom){
			if (custom.onAdd) custom.onAdd.call(this, fn);
			if (custom.condition){
				condition = function(event){
					if (custom.condition.call(this, event)) return fn.call(this, event);
					return true;
				};
			}
			realType = custom.base || realType;
		}
		var defn = function(){
			return fn.call(self);
		};
		var nativeEvent = Element.NativeEvents[realType];
		if (nativeEvent){
			if (nativeEvent == 2){
				defn = function(event){
					event = new Event(event, self.getWindow());
					if (condition.call(self, event) === false) event.stop();
				};
			}
			this.addListener(realType, defn, arguments[2]);
		}
		events[type].values.push(defn);
		return this;
	},

	removeEvent: function(type, fn){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		var list = events[type];
		var index = list.keys.indexOf(fn);
		if (index == -1) return this;
		var value = list.values[index];
		delete list.keys[index];
		delete list.values[index];
		var custom = Element.Events[type];
		if (custom){
			if (custom.onRemove) custom.onRemove.call(this, fn);
			type = custom.base || type;
		}
		return (Element.NativeEvents[type]) ? this.removeListener(type, value, arguments[2]) : this;
	},

	addEvents: function(events){
		for (var event in events) this.addEvent(event, events[event]);
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		var attached = this.retrieve('events');
		if (!attached) return this;
		if (!events){
			for (type in attached) this.removeEvents(type);
			this.eliminate('events');
		} else if (attached[events]){
			attached[events].keys.each(function(fn){
				this.removeEvent(events, fn);
			}, this);
			delete attached[events];
		}
		return this;
	},

	fireEvent: function(type, args, delay){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		args = Array.from(args);

		events[type].keys.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	cloneEvents: function(from, type){
		from = document.id(from);
		var events = from.retrieve('events');
		if (!events) return this;
		if (!type){
			for (var eventType in events) this.cloneEvents(from, eventType);
		} else if (events[type]){
			events[type].keys.each(function(fn){
				this.addEvent(type, fn);
			}, this);
		}
		return this;
	}

});

Element.NativeEvents = {
	click: 2, dblclick: 2, mouseup: 2, mousedown: 2, contextmenu: 2, //mouse buttons
	mousewheel: 2, DOMMouseScroll: 2, //mouse wheel
	mouseover: 2, mouseout: 2, mousemove: 2, selectstart: 2, selectend: 2, //mouse movement
	keydown: 2, keypress: 2, keyup: 2, //keyboard
	orientationchange: 2, // mobile
	touchstart: 2, touchmove: 2, touchend: 2, touchcancel: 2, // touch
	gesturestart: 2, gesturechange: 2, gestureend: 2, // gesture
	focus: 2, blur: 2, change: 2, reset: 2, select: 2, submit: 2, //form elements
	load: 2, unload: 1, beforeunload: 2, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
	error: 1, abort: 1, scroll: 1 //misc
};

var check = function(event){
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != this && related.prefix != 'xul' && typeOf(this) != 'document' && !this.contains(related));
};

Element.Events = {

	mouseenter: {
		base: 'mouseover',
		condition: check
	},

	mouseleave: {
		base: 'mouseout',
		condition: check
	},

	mousewheel: {
		base: (Browser.firefox) ? 'DOMMouseScroll' : 'mousewheel'
	}

};

//<1.2compat>

Element.Events = new Hash(Element.Events);

//</1.2compat>

})();

/*
---
 
script: DOM.js
 
description: Provides DOM-compliant interface to play around with other widgets
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Module
  - Core/Element.Event

provides:
  - LSD.Module.DOM
  - LSD.Module.DOM.findDocument

...
*/

!function() {

LSD.Module.DOM = new Class({
  options: {
    nodeType: 1,
  },
  
  initializers: {
    dom: function(options) {
      this.childNodes = [];
      this.nodeType = options.nodeType;
      this.nodeName = this.tagName = options.tag;
      return {
        events: {
          element: {
            /*
            When dispose event comes from the element, 
            it is is already removed from dom
            */
            //'dispose': ['dispose', true]
          },
          self: {
            'dispose': function(parent, light) {
              if (light !== true && this.element) this.element.dispose();
            },
            'destroy': function() {
              if (this.parentNode) this.dispose();
            }
          }
        }
      }
    }
  },
  
  contains: function(element) {
    while (element = element.parentNode) if (element == this) return true;
    return false;
  },
  
  getChildren: function() {
    return this.childNodes;
  },

  getRoot: function() {
    var widget = this;
    while (widget.parentNode) widget = widget.parentNode;
    return widget;
  },
  
  setParent: function(widget){
    widget = LSD.Module.DOM.find(widget);
    this.parentNode = widget;
    this.fireEvent('setParent', [widget, widget.document])
    var siblings = widget.childNodes;
    var length = siblings.length;
    if (length == 1) widget.firstChild = this;
    widget.lastChild = this;
    var previous = siblings[length - 2];
    if (previous) {
      previous.nextSibling = this;
      this.previousSibling = previous;
    }
  },
  
  unsetParent: function(widget) {
    var parent = this.parentNode;
    if (parent.firstChild == this) delete parent.firstChild;
    if (parent.lastChild == this) delete parent.lastChild;
    delete this.parentNode;
  },
  
  appendChild: function(widget, adoption) {
    this.childNodes.push(widget);
    widget.setParent(this);
    if (!widget.quiet && (adoption !== false) && this.toElement()) (adoption || function() {
      this.element.appendChild(widget.toElement());
    }).apply(this, arguments);
    delete widget.quiet;
    this.fireEvent('adopt', [widget]);
    LSD.Module.DOM.walk(widget, function(node) {
      this.dispatchEvent('nodeInserted', node);
    }, this);
    return true;
  },
  
  removeChild: function(widget) {
    LSD.Module.DOM.walk(widget, function(node) {
      this.dispatchEvent('nodeRemoved', node);
    }, this);
    widget.unsetParent(this);
    this.childNodes.erase(widget);
  },
  
  insertBefore: function(insertion, element) {
    return this.appendChild(insertion, function() {
      element.parentNode.insertBefore(document.id(insertion), document.id(element))
    });
  },
  
  extractDocument: function(widget) {
    var element = widget.lsd ? widget.element : widget;;
    var isDocument = widget.documentElement || (instanceOf(widget, LSD.Document));
    var parent = this.parentNode;
    if (isDocument  // if document
    || (parent && parent.dominjected) //already injected widget
    || (widget.ownerDocument && (widget.ownerDocument.body == widget)) //body element
    || element.offsetParent) { //element in dom (costy check)
      return (parent && parent.document) || (isDocument ? widget : LSD.Module.DOM.findDocument(widget));
    }
  },
  
  setDocument: function(document) {
    LSD.Module.DOM.walk(this, function(child) {
      child.ownerDocument = child.document = document;
      child.fireEvent('setDocument', document);
      child.fireEvent('dominject', [child.element.parentNode, document]);
      child.dominjected = true;
    });
    return this;
  },
  
  inject: function(widget, where, quiet) {
    if (!widget.lsd) {
      var instance = LSD.Module.DOM.find(widget, true)
      if (instance) widget = instance;
    }
    this.quiet = quiet || (widget.documentElement && this.element && this.element.parentNode);
    if (where === false) widget.appendChild(this, false)
    else if (!inserters[where || 'bottom'](widget.lsd ? this : this.toElement(), widget) && !quiet) return false;
    if (quiet !== true || widget.document) {
      var document = widget.document || (this.documentElement ? this : this.extractDocument(widget));
      if (document) this.setDocument(document);
    }
    this.fireEvent('inject', this.parentNode);
    return this;
  },

  grab: function(el, where){
    inserters[where || 'bottom'](document.id(el, true), this);
    return this;
  },
  
  /*
    Wrapper is where content nodes get appended. 
    Defaults to this.element, but can be redefined
    in other Modules or Traits (as seen in Container
    module)
  */
  
  getWrapper: function() {
    return this.toElement();
  },
  
  write: function(content) {
    if (!content || !(content = content.toString())) return;
    var wrapper = this.getWrapper();
    if (this.written) for (var node; node = this.written.shift();) Element.dispose(node);
    var fragment = document.createFragment(content);
    this.written = Array.prototype.slice.call(fragment.childNodes, 0);
    wrapper.appendChild(fragment);
    this.fireEvent('write', [this.written])
    this.innerText = wrapper.get('text').trim();
    return this.written;
  },

  replaces: function(el){
    this.inject(el, 'after');
    el.dispose();
    return this;
  },
  
  onDOMInject: function(callback) {
    if (this.document) callback.call(this, this.document.element) 
    else this.addEvent('dominject', callback.bind(this))
  },
  
  dispose: function(mode) {
    var parent = this.parentNode;
    if (!parent) return;
    this.fireEvent('beforeDispose', parent);
    parent.removeChild(this);
    this.fireEvent('dispose', [parent, mode]);
    return this;
  }
});

var inserters = {

  before: function(context, element){
    var parent = element.parentNode;
    if (parent) return parent.insertBefore(context, element);
  },

  after: function(context, element){
    var parent = element.parentNode;
    if (parent) return parent.insertBefore(context, element.nextSibling);
  },

  bottom: function(context, element){
    return element.appendChild(context);
  },

  top: function(context, element){
    return element.insertBefore(context, element.firstChild);
  }

};

Object.append(LSD.Module.DOM, {
  walk: function(element, callback, bind, memo) {
    var widget = element.lsd ? element : LSD.Module.DOM.find(element, true);
    if (widget) {
      var result = callback.call(bind || this, widget, memo);
      if (result) (memo || (memo = [])).push(widget);
    }
    for (var nodes = element.childNodes, node, i = 0; node = nodes[i]; i++) 
      if (node.nodeType == 1) LSD.Module.DOM.walk(node, callback, bind, memo); 
    return memo;
  },
  
  find: function(target, lazy) {
    return target.lsd ? target : ((!lazy || target.uid) && Element[lazy ? 'retrieve' : 'get'](target, 'widget'));
  },
  
  findDocument: function(target) {
    if (target.documentElement) return target;
    if (target.document) return target.document;
    if (target.lsd) return;
    var body = target.ownerDocument.body;
    var document = (target != body) && Element.retrieve(body, 'widget');
    while (!document && (target = target.parentNode)) {
      var widget = Element.retrieve(target, 'widget')
      if (widget) document = (widget instanceof LSD.Document) ? widget : widget.document;
    }
    return document;
  },
  
  getID: function(target) {
    if (target.lsd) {
      return target.attributes.itemid;
    } else {
      return target.getAttribute('itemid');
    }
  }
});

}();
/*
---
 
script: Render.js
 
description: A module that provides rendering workflow
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM

provides: 
  - LSD.Module.Render

...
*/



LSD.Module.Render = new Class({
  options: {
    render: null
  },
  
  initializers: {
    render: function() {
      this.redraws = 0;
      this.dirty = true;
      return {
        events: {
          stateChange: function() {
            if (this.redraws > 0) this.refresh(true);
          }
        }
      }
    }
  },
  
  render: function() {
    if (!this.built) this.build();
    delete this.halted;
    this.redraws++;
    this.fireEvent('render', arguments)
    this.childNodes.each(function(child){
      if (child.render) child.render();
    });
  },
  
  /*
    Update marks widget as willing to render. That
    can be followed by a call to *render* to trigger
    redrawing mechanism. Otherwise, the widget stay 
    marked and can be rendered together with ascendant 
    widget.
  */
  
  update: function(recursive) {
    if (recursive) LSD.Module.DOM.walk(this, function(widget) {
      widget.update();
    });
  },
  
  /*
    Refresh updates and renders widget (or a widget tree 
    if optional argument is true). It is a reliable way
    to have all elements redrawn, but a costly too.
    
    Should be avoided when possible to let internals 
    handle the rendering and avoid some unnecessary 
    calculations.
  */

  refresh: function(recursive) {
    this.update(recursive);
    return this.render();
  },
  

  /*
    Halt marks widget as failed to render.
    
    Possible use cases:
    
    - Dimensions depend on child widgets that are not
      rendered yet
    - Dont let the widget render when it is not in DOM
  */ 
  halt: function() {
    if (this.halted) return false;
    this.halted = true;
    return true;
  }
});
/*
---
 
script: Container.js
 
description: Makes widget use container - wrapper around content setting
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM

provides:
  - LSD.Module.Container
 
...
*/

LSD.Module.Container = new Class({
  options: {
    container: {
      enabled: true,
      position: null,
      inline: true,
      attributes: {
        'class': 'container'
      }
    },
    
    proxies: {
      container: {
        container: function() {
          return $(this.getContainer()) //creates container, once condition is true
        },
        condition: function() {         //turned off by default
          return false 
        },      
        priority: -1,                   //lowest priority
        rewrite: false                  //does not rewrite parent
      }
    }
  },
  
  getContainer: Macro.getter('container', function() {
    var options = this.options.container;
    if (!options.enabled) return;
    var tag = options.tag || (options.inline ? 'span' : 'div');
    return new Element(tag, options.attributes).inject(this.element, options.position);
  }),
  
  getWrapper: function() {
    return this.getContainer() || this.toElement();
  }
});
/*
---

script: Proxies.js

description: Dont adopt children, pass them to some other widget

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM

provides: 
  - LSD.Module.Proxies

...
*/
  
LSD.Module.Proxies = new Class({
  initializers: {
    proxies: function() {
      this.proxies = [];
    }
  },
  
  addProxy: function(name, proxy) {
    for (var i = 0, other; (other = this.proxies[i]) && ((proxy.priority || 0) < (other.priority || 0)); i++);
    this.proxies.splice(i, 0, proxy);
  },
  
  removeProxy: function(name, proxy) {
    this.proxies.erase(proxy);
  },
  
  proxyChild: function(child) {
    for (var i = 0, proxy; proxy = this.proxies[i++];) {
      if (!proxy.condition.call(this, child)) continue;
      var self = this;
      var reinject = function(target) {
        if (proxy.rewrite === false) {
          self.appendChild(child, function() {
            target.adopt(child);
          });
        } else {
          child.inject(target);
        }
      };
      var container = proxy.container;
      if (container.call) {
        if ((container = container.call(this, reinject))) reinject(container);
      } else {
        this.use(container, reinject)
      }
      return true;
    }
  },
  
  appendChild: function(widget, adoption) {
    if (!adoption && this.canAppendChild && !this.canAppendChild(widget)) {
      if (widget.parentNode) widget.dispose();
      else if (widget.element.parentNode) widget.element.dispose();
      return false;
    }
    return LSD.Module.DOM.prototype.appendChild.apply(this, arguments);
  },
  
  canAppendChild: function(child) {
    return !this.proxyChild(child);
  }
  
});

LSD.Options.proxies = {
  add: 'addProxy',
  remove: 'removeProxy',
  iterate: true
};
/*
---

name: Element.defineCustomEvent

description: Allows to create custom events based on other custom events.

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/Element.Event]

provides: Element.defineCustomEvent

...
*/

(function(){

[Element, Window, Document].invoke('implement', {hasEvent: function(event){
	var events = this.retrieve('events'),
		list = (events && events[event]) ? events[event].values : null;
	if (list){
		for (var i = list.length; i--;) if (i in list){
			return true;
		}
	}
	return false;
}});

var wrap = function(custom, method, extended, name){
	method = custom[method];
	extended = custom[extended];

	return function(fn, customName){
		if (!customName) customName = name;

		if (extended && !this.hasEvent(customName)) extended.call(this, fn, customName);
		if (method) method.call(this, fn, customName);
	};
};

var inherit = function(custom, base, method, name){
	return function(fn, customName){
		base[method].call(this, fn, customName || name);
		custom[method].call(this, fn, customName || name);
	};
};

var events = Element.Events;

Element.defineCustomEvent = function(name, custom){

	var base = events[custom.base];

	custom.onAdd = wrap(custom, 'onAdd', 'onSetup', name);
	custom.onRemove = wrap(custom, 'onRemove', 'onTeardown', name);

	events[name] = base ? Object.append({}, custom, {

		base: base.base,

		condition: function(event){
			return (!base.condition || base.condition.call(this, event)) &&
				(!custom.condition || custom.condition.call(this, event));
		},

		onAdd: inherit(custom, base, 'onAdd', name),
		onRemove: inherit(custom, base, 'onRemove', name)

	}) : custom;

	return this;

};

var loop = function(name){
	var method = 'on' + name.capitalize();
	Element[name + 'CustomEvents'] = function(){
		Object.each(events, function(event, name){
			if (event[method]) event[method].call(event, name);
		});
	};
	return loop;
};

loop('enable')('disable');

})();

/*
---

name: Touch

description: Provides a custom touch event on mobile devices

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/Element.Event, Custom-Event/Element.defineCustomEvent, Browser.Features.Touch]

provides: Touch

...
*/

(function(){

var preventDefault = function(event){
	event.preventDefault();
};

var disabled;

Element.defineCustomEvent('touch', {

	base: 'touchend',

	condition: function(event){
		if (disabled || event.targetTouches.length != 0) return false;

		var touch = event.changedTouches[0],
			target = document.elementFromPoint(touch.clientX, touch.clientY);

		do {
			if (target == this) return true;
		} while ((target = target.parentNode) && target);

		return false;
	},

	onSetup: function(){
		this.addEvent('touchstart', preventDefault);
	},

	onTeardown: function(){
		this.removeEvent('touchstart', preventDefault);
	},

	onEnable: function(){
		disabled = false;
	},

	onDisable: function(){
		disabled = true;
	}

});

})();

/*
---

name: Click

description: Provides a replacement for click events on mobile devices

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Touch]

provides: Click

...
*/

if (Browser.Features.iOSTouch) (function(){

var name = 'click';
delete Element.NativeEvents[name];

Element.defineCustomEvent(name, {

	base: 'touch'

});

})();

/*
---

name: Mouse

description: Maps mouse events to their touch counterparts

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Custom-Event/Element.defineCustomEvent, Browser.Features.Touch]

provides: Mouse

...
*/

if (!Browser.Features.Touch) (function(){

var condition = function(event){
  event.targetTouches = [];
  event.changedTouches = event.touches = [{
    pageX: event.page.x, pageY: event.page.y,
    clientX: event.client.x, clientY: event.client.y
  }];

  return true;
};

var mouseup = function(e) {
  var target = e.target;
  while (target != this && (target = target.parentNode));
  this.fireEvent(target ? 'touchend' : 'touchcancel', arguments);
  document.removeEvent('mouseup', this.retrieve('touch:mouseup'));
};

Element.defineCustomEvent('touchstart', {

  base: 'mousedown',

  condition: function() {
    var bound = this.retrieve('touch:mouseup');
    if (!bound) {
      bound = mouseup.bind(this);
      this.store('touch:mouseup', bound);
    }
    document.addEvent('mouseup', bound);
    return condition.apply(this, arguments);
  }

}).defineCustomEvent('touchmove', {

  base: 'mousemove',

  condition: condition

});

})();

/*
---
 
script: Touchable.js
 
description: A mousedown event that lasts even when you move your mouse over. 
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - Mobile/Mouse
  - Mobile/Click
  - Mobile/Touch

 
provides:   
  - LSD.Mixin.Touchable
 
...
*/


LSD.Mixin.Touchable = new Class({
  behaviour: ':touchable',
  
  options: {
    events: {
      enabled: {
        element: {
          'touchstart': 'activate',
          'touchend': 'deactivate',
          'touchcancel': 'deactivate'
        }
      }
    },
    states: {
      active: {
        enabler: 'activate',
        disabler: 'deactivate'
      }
    }
  }
});
/*
---

name: DOMReady

description: Contains the custom event domready.

license: MIT-style license.

requires: [Browser, Element, Element.Event]

provides: [DOMReady, DomReady]

...
*/

(function(window, document){

var ready,
	loaded,
	checks = [],
	shouldPoll,
	timer,
	testElement = document.createElement('div');

var domready = function(){
	clearTimeout(timer);
	if (ready) return;
	Browser.loaded = ready = true;
	document.removeListener('DOMContentLoaded', domready).removeListener('readystatechange', check);
	
	document.fireEvent('domready');
	window.fireEvent('domready');
};

var check = function(){
	for (var i = checks.length; i--;) if (checks[i]()){
		domready();
		return true;
	}
	return false;
};

var poll = function(){
	clearTimeout(timer);
	if (!check()) timer = setTimeout(poll, 10);
};

document.addListener('DOMContentLoaded', domready);

/*<ltIE8>*/
// doScroll technique by Diego Perini http://javascript.nwbox.com/IEContentLoaded/
// testElement.doScroll() throws when the DOM is not ready, only in the top window
var doScrollWorks = function(){
	try {
		testElement.doScroll();
		return true;
	} catch (e){}
	return false;
}
// If doScroll works already, it can't be used to determine domready
//   e.g. in an iframe
if (testElement.doScroll && !doScrollWorks()){
	checks.push(doScrollWorks);
	shouldPoll = true;
}
/*</ltIE8>*/

if (document.readyState) checks.push(function(){
	var state = document.readyState;
	return (state == 'loaded' || state == 'complete');
});

if ('onreadystatechange' in document) document.addListener('readystatechange', check);
else shouldPoll = true;

if (shouldPoll) poll();

Element.Events.domready = {
	onAdd: function(fn){
		if (ready) fn.call(this);
	}
};

// Make sure that domready fires before load
Element.Events.load = {
	base: 'load',
	onAdd: function(fn){
		if (loaded && this == window) fn.call(this);
	},
	condition: function(){
		if (this == window){
			domready();
			delete Element.Events.load;
		}
		return true;
	}
};

// This is based on the custom load event
window.addEvent('load', function(){
	loaded = true;
});

})(window, document);

/*
---
 
script: Application.js
 
description: A class to handle execution and bootstraping of LSD
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Core/DomReady
  - Core/Options
  - Core/Events
  - More/String.QueryString
  
provides:
  - LSD.Application
 
...
*/
LSD.Application = new Class({
  Implements: [Options, Events],
  
  options: {
    method: 'augment'
  },
  
  initialize: function(document, options) {
    if (!LSD.application) LSD.application = this;
    this.param = (location.search.length > 1) ? location.search.substr(1, location.search.length - 1).parseQueryString() : {}
    if (document) this.element = document.id(document);
    if (options) this.setOptions(options);
    document.addEvent('domready', function() {
      if (this.param.benchmark != null) console.profile();
      this.setDocument(document);
      if (this.param.benchmark != null) console.profileEnd();
    }.bind(this));
  },
  
  setHead: function(head) {
    for (var i = 0, el, els = head.getElementsByTagName('meta'); el = els[i++];) {
      var type = el.getAttribute('rel');
      if (type) {
        if (!this[type]) this[type] = {};
        var content = el.getAttribute('content')
        this[type][el.getAttribute('name')] = (content.charAt(0) =="{") ? JSON.decode(content) : content;
      }
    }
  },
  
  setDocument: function(document) {
    this.setHead(document.head);
    var element = this.element = document.body;
    this.setBody(document.body);
  },
  
  setBody: function(element) {
    this.fireEvent('beforeBody', element);
    var body = this.body = new (this.getBodyClass(element))(element);
    this.fireEvent('body', [body, element]);
    return body;
  },
  
  getBodyClass: function() {
    return LSD.Element.find('body');
  },
  
  getBody: function() {
    return this.body;
  },
  
  redirect: function(url) {
    window.location.href = url;
  }
  
});
/*
---

name: Element.Style

description: Contains methods for interacting with the styles of Elements in a fashionable way.

license: MIT-style license.

requires: Element

provides: Element.Style

...
*/

(function(){

var html = document.html;

Element.Properties.styles = {set: function(styles){
	this.setStyles(styles);
}};

var hasOpacity = (html.style.opacity != null);
var reAlpha = /alpha\(opacity=([\d.]+)\)/i;

var setOpacity = function(element, opacity){
	if (!element.currentStyle || !element.currentStyle.hasLayout) element.style.zoom = 1;
	if (hasOpacity){
		element.style.opacity = opacity;
	} else {
		opacity = (opacity * 100).limit(0, 100).round();
		opacity = (opacity == 100) ? '' : 'alpha(opacity=' + opacity + ')';
		var filter = element.style.filter || element.getComputedStyle('filter') || '';
		element.style.filter = reAlpha.test(filter) ? filter.replace(reAlpha, opacity) : filter + opacity;
	}
};

Element.Properties.opacity = {

	set: function(opacity){
		var visibility = this.style.visibility;
		if (opacity == 0 && visibility != 'hidden') this.style.visibility = 'hidden';
		else if (opacity != 0 && visibility != 'visible') this.style.visibility = 'visible';

		setOpacity(this, opacity);
	},

	get: (hasOpacity) ? function(){
		var opacity = this.style.opacity || this.getComputedStyle('opacity');
		return (opacity == '') ? 1 : opacity;
	} : function(){
		var opacity, filter = (this.style.filter || this.getComputedStyle('filter'));
		if (filter) opacity = filter.match(reAlpha);
		return (opacity == null || filter == null) ? 1 : (opacity[1] / 100);
	}

};

var floatName = (html.style.cssFloat == null) ? 'styleFloat' : 'cssFloat';

Element.implement({

	getComputedStyle: function(property){
		if (this.currentStyle) return this.currentStyle[property.camelCase()];
		var defaultView = Element.getDocument(this).defaultView,
			computed = defaultView ? defaultView.getComputedStyle(this, null) : null;
		return (computed) ? computed.getPropertyValue((property == floatName) ? 'float' : property.hyphenate()) : null;
	},

	setOpacity: function(value){
		setOpacity(this, value);
		return this;
	},

	getOpacity: function(){
		return this.get('opacity');
	},

	setStyle: function(property, value){
		switch (property){
			case 'opacity': return this.set('opacity', parseFloat(value));
			case 'float': property = floatName;
		}
		property = property.camelCase();
		if (typeOf(value) != 'string'){
			var map = (Element.Styles[property] || '@').split(' ');
			value = Array.from(value).map(function(val, i){
				if (!map[i]) return '';
				return (typeOf(val) == 'number') ? map[i].replace('@', Math.round(val)) : val;
			}).join(' ');
		} else if (value == String(Number(value))){
			value = Math.round(value);
		}
		this.style[property] = value;
		return this;
	},

	getStyle: function(property){
		switch (property){
			case 'opacity': return this.get('opacity');
			case 'float': property = floatName;
		}
		property = property.camelCase();
		var result = this.style[property];
		if (!result || property == 'zIndex'){
			result = [];
			for (var style in Element.ShortStyles){
				if (property != style) continue;
				for (var s in Element.ShortStyles[style]) result.push(this.getStyle(s));
				return result.join(' ');
			}
			result = this.getComputedStyle(property);
		}
		if (result){
			result = String(result);
			var color = result.match(/rgba?\([\d\s,]+\)/);
			if (color) result = result.replace(color[0], color[0].rgbToHex());
		}
		if (Browser.opera || (Browser.ie && isNaN(parseFloat(result)))){
			if ((/^(height|width)$/).test(property)){
				var values = (property == 'width') ? ['left', 'right'] : ['top', 'bottom'], size = 0;
				values.each(function(value){
					size += this.getStyle('border-' + value + '-width').toInt() + this.getStyle('padding-' + value).toInt();
				}, this);
				return this['offset' + property.capitalize()] - size + 'px';
			}
			if (Browser.opera && String(result).indexOf('px') != -1) return result;
			if ((/^border(.+)Width|margin|padding/).test(property)) return '0px';
		}
		return result;
	},

	setStyles: function(styles){
		for (var style in styles) this.setStyle(style, styles[style]);
		return this;
	},

	getStyles: function(){
		var result = {};
		Array.flatten(arguments).each(function(key){
			result[key] = this.getStyle(key);
		}, this);
		return result;
	}

});

Element.Styles = {
	left: '@px', top: '@px', bottom: '@px', right: '@px',
	width: '@px', height: '@px', maxWidth: '@px', maxHeight: '@px', minWidth: '@px', minHeight: '@px',
	backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px', color: 'rgb(@, @, @)',
	fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', clip: 'rect(@px @px @px @px)',
	margin: '@px @px @px @px', padding: '@px @px @px @px', border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
	borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @', borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
	zIndex: '@', 'zoom': '@', fontWeight: '@', textIndent: '@px', opacity: '@'
};

//<1.2compat>

Element.Styles = new Hash(Element.Styles);

//</1.2compat>

Element.ShortStyles = {margin: {}, padding: {}, border: {}, borderWidth: {}, borderStyle: {}, borderColor: {}};

['Top', 'Right', 'Bottom', 'Left'].each(function(direction){
	var Short = Element.ShortStyles;
	var All = Element.Styles;
	['margin', 'padding'].each(function(style){
		var sd = style + direction;
		Short[style][sd] = All[sd] = '@px';
	});
	var bd = 'border' + direction;
	Short.border[bd] = All[bd] = '@px @ rgb(@, @, @)';
	var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
	Short[bd] = {};
	Short.borderWidth[bdw] = Short[bd][bdw] = All[bdw] = '@px';
	Short.borderStyle[bds] = Short[bd][bds] = All[bds] = '@';
	Short.borderColor[bdc] = Short[bd][bdc] = All[bdc] = 'rgb(@, @, @)';
});

})();

/*
---
 
script: Styles.js
 
description: Set, get and render different kind of styles on widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Element.Style
  - Ext/FastArray
  - Sheet/SheetParser.Styles

provides: 
  - LSD.Module.Styles

...
*/

!function() {
  
var CSS = SheetParser.Styles, Paint = LSD.Styles;
var setStyle = function(element, property, value, type) {
  delete this.style.expressed[property];
  delete this.style.calculated[property];
  if (value === false) {
    if (element && this.element) delete this.element.style[property];
    delete this.style[element ? 'element' : 'paint'][property], delete this.style.current[property];
    if (type) delete this.style[type][property];
  } else {
    if (element && this.element) this.element.style[property] = (typeof value == 'number') ? value + 'px' : value;
    this.style[element ? 'element' : 'paint'][property] = this.style.current[property] = value;
    if (type) this.style[type][property] = value;
  }
}

LSD.Module.Styles = new Class({
  initializers: {
    style: function() {
      this.rules = [];
      this.style = {    // Styles that...
        current: {},    // ... widget currently has
        found: {},      // ... were found in stylesheets
        given: {},      // ... were manually assigned

        changed: {},    // ... came from stylesheet since last render
        calculated: {}, // ... are calculated in runtime
        computed: {},   // ... are already getStyled
        expressed: {},  // ... are expressed through function
        implied: {},    // ... are assigned by environment

        element: {},    // ... are currently assigned to element
        paint: {}       // ... are currently used to paint
      };
      return {
        events: {
          update: function() {
            this.style.calculated = {};
            this.style.computed = {};
          }
        }
      } 
    }
  },

  setStyle: function(property, value) {
    var paint, css;
    if (!(paint = Paint[property]) && !(css = CSS[property])) return false;
    var length = arguments.length;
    if (length > 2) {
      if (arguments[length - 1] in this.style) var type = arguments[--length];
      if (length > 2) value = Array.prototype.splice.call(arguments, 1, length);
    }
    if (value.call) {
      var expression = value;
      value = value.call(this, property);
    }
    var result = (css || paint)[value.push ? 'apply' : 'call'](this, value);
    if (result === true || result === false) setStyle.call(this, css, property, value, type);
    else for (var prop in result) setStyle.call(this, css, prop, result[prop], type);
    if (expression) {
      this.style.expressed[property] = expression
      this.style.computed[property] = value
    }
    return result;
  },

  setStyles: function(style, type) {
    for (var key in style) this.setStyle(key, style[key], type)
  },

  getStyle: function(property) {
    if (this.style.computed[property]) return this.style.computed[property];
    var value;
    var definition = Paint[property] || CSS[property];
    if (!definition) return;
    if (definition.properties) return definition.properties.map(this.getStyle.bind(this));
    var expression = this.style.expressed[property];    
    if (expression) {
      value = this.style.current[property] = this.calculateStyle(property, expression);
    } else {  
      value = this.style.current[property];
      if (property == 'height') {
        if (typeof value !== 'number') value = this.getClientHeight();
      } else if (property == 'width') {
        if (typeof value !== 'number') value = this.getClientWidth();
      } else {
        if (value == "inherit") value = this.inheritStyle(property);
        if (value == "auto") value = this.calculateStyle(property);
      }
    }
    this.style.computed[property] = value;
    return value;
  },

  getStyles: function(properties) {
    var result = {};
    for (var i = 0, property, args = arguments; property = args[i++];) result[property] = this.getStyle(property);
    return result;
  },
  
  renderStyles: function(styles) {
    var style = this.style, 
        current = style.current,
        paint = style.paint, 
        element = style.element,  
        found = style.found,
        implied = style.implied,
        calculated = style.calculated,
        given = Object.append(style.given, styles),
        changed = style.changed;
    this.setStyles(given, 'given')
    for (var property in found) if ((property in changed) && !(property in given)) this.setStyle(property, found[property]);
    Object.append(style.current, style.implied);
    for (var property in element)  {
      if (!(property in given) && !(property in found) && !(property in calculated) && !(property in implied)) {
        this.element.style[property] = '';
        delete element[property]
      }
    }
    for (var property in current)  {
      if (!(property in given) && !(property in found) && !(property in calculated) && !(property in implied)) {
        delete current[property];
        delete paint[property];
      }
    }
  },
  
  combineRules: function(rule) {
    var rules = this.rules, style = this.style, found = style.found = {}, implied = style.implied = {}, changed = style.changed;
    for (var j = rules.length, other; other = rules[--j];) {
      var setting = other.style, implying = other.implied, self = (rule == other);
      if (setting) for (var property in setting) if (!(property in found)) {
        if (self) changed[property] = setting[property];
        found[property] = setting[property];
      }
      if (implying) for (var property in implying) if (!(property in implied)) implied[property] = implying[property];
    }
  },
  
  addRule: function(rule) {
    var rules = this.rules;
    if (rules.indexOf(rule) > -1) return
    for (var i = 0, other;  other = rules[i++];) {
      if ((other.specificity > rule.specificity) || (other.specificity == rule.specificity)) 
        if (other.index > rule.index) break;
    }
    rules.splice(--i, 0, rule);
    this.combineRules(rule);
  },
  
  removeRule: function(rule) {
    var rules = this.rules, index = rules.indexOf(rule)
    if (index == -1) return
    rules.splice(index, 1);
    this.combineRules();
    var style = this.style, found = style.found, changed = style.changed, setting = rule.style;
    for (var property in setting) if (!Object.equals(found[property], setting[property])) changed[property] = found[property];
 },
  
  inheritStyle: function(property) {
    var node = this;
    var style = node.style.current[property];
    while ((style == 'inherit' || !style) && (node = node.parentNode)) style = node.style.current[property];
    return style;
  },
  
  calculateStyle: function(property, expression) {
    if (this.style.calculated[property]) return this.style.calculated[property];
    var value;
    if (expression) {
      value = expression.call(this, property);
    } else {
      switch (property) {
        case "height":
          value = this.getClientHeight();
        case "width":
          value = this.inheritStyle(property);
          if (value == "auto") value = this.getClientWidth();
        case "height": case "width":  
          //if dimension size is zero, then the widget is not in DOM yet
          //so we wait until the root widget is injected, and then try to repeat
          if (value == 0 && (this.redraws == 0)) this.halt();
      }
    }
    this.style.calculated[property] = value;
    return value;
  },
  
  render: function(style) {
    this.renderStyles(style);
    this.parent.apply(this, arguments);
  }
});

LSD.Options.styles = {
  add: 'setStyles',
  remove: 'unsetStyles'
};
}();
/*
---
 
script: Layer.js
 
description: Adds a piece of SVG that can be drawn with widget styles
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - ART/ART.Shape
  - LSD.Module.Styles
  - Sheet/SheetParser.Styles
 
provides: 
  - LSD.Layer
  - LSD.Layer.Shaped
 
...
*/

!function() {
  
LSD.Layer = function(name, styles, painters) {
  this.name = name;
  this.styles = styles;
  this.painters = painters;
}

LSD.Layer.prototype = {
  render: function(widget, commands) {
    var canvas = widget.getCanvas();
    var shape = commands.shape;
    if (shape == 'none') return;
    if (!shape) shape = widget.getStyle('shape') || 'rectangle';
    var layer = widget.shapes[this.name];
    if (shape.glyph) {
      var glyph = ART.Glyphs[shape.glyph];
      if (!glyph) return;    
      var path = new ART.Path(glyph);
      var box = path.measure();
      if (!layer) layer = new ART.Shape(path, box.width, box.height);
      if (commands.size && !Object.equals(previous ? previous.size : box, commands.size))
        layer.resizeTo(commands.size.width, commands.size.height)
        
    } else if (!shape.indexOf){
      for (var name in shape) {
        var values = shape[name];
        if (!values.push) values = [values];
        shape = name;
      }
    }
    if (!layer) {
      var path = ART.Shape[shape.capitalize()];
      if (!path) return;
      var layer = new path;
      layer.render(commands)
    } else {
      var previous = layer.commands;
      if (layer.draw && layer.render) layer.render(commands)
    }
    layer.commands = commands;
    widget.shapes[this.name] = layer;
    for (command in commands) {
      var value = commands[command];
      if (layer[command] && command != 'move') {
        if (!value || !previous || !Object.equals(previous[command], value)) layer[command][value && value.push ? 'apply' : 'call'](layer, value);
      }
    }
    var translate = commands.translate = {x: 0, y: 0}
    if (commands.inside) {
      translate.x += commands.inside.left
      translate.y += commands.inside.top;
    };
    //if (commands.outside) {
    //  top += commands.outside.top;
    //  left += commands.outside.left
    //};
    if (commands.move) {
      translate.x += commands.move.x;
      translate.y += commands.move.y;
    }
    if (!previous || !Object.equals(previous.translate, translate)) layer.moveTo(translate.x, translate.y)
  },
  
  draw: function(widget, context, previous) {
    context = Object.append({size: widget.size, style: widget.style.current}, context || {});
    if (context.style.cornerRadiusTopLeft !== null) {
      context.radius = widget.getStyle('cornerRadius')
    }
    var inherited = {}, overwritten = {};
    for (var painter, i = 0; painter = this.painters[i++];) {
      var commands = painter.paint.apply(context, painter.keys.map(function(prop) { return widget.getStyle(prop)}));
      for (var name in commands) {
        var value = commands[name];
        if (Inherit[name]) {;
          inherited[name] = merge(value, context[name])
        } else {
          if (!Accumulate[name]) overwritten[name] = context[name]
          context[name] = (Accumulate[name] || Merge[name]) ? merge(value, context[name]) : value;
        }
      }
      //for (var command in value) this[command](command[value]);
    }    
    this.render(widget, context);
    return Object.append(context, overwritten, inherited);;
  }
}

var merge = function(value, old) {
  if (typeof value == "object") {
    if (value.push) {
      for (var j = 0, k = value.length; j < k; j++) {
        var item = value[j] || 0;
        if (old) old[j] = (old[j] || 0) + item;
        else old = [item]
      }
      return old;
    } else if (!value.indexOf) {
      for (var prop in value) {
        var item = value[prop] || 0;
        if (!old) old = {}
        old[prop] = (old[prop] || 0) + item;
      }
      return old;
    }
  }  
  return value;
}

var Accumulate = LSD.Layer.accumulated = new FastArray('translate', 'radius');
var Inherit = LSD.Layer.inherited = new FastArray('inside', 'outside')
var Merge = LSD.Layer.merged = new FastArray('size')

var Property = SheetParser.Property;
var Styles = LSD.Styles;
var Map = LSD.Layer.Map = {};
var Cache = LSD.Layer.Cache = {};

//LSD.Layer.getProperty = function(property, properties)
 
LSD.Layer.generate = function(name, layers) {
  if (arguments.length > 2) layers = Array.prototype.splice.call(arguments, 1);
  var painters = [];
  var styles = LSD.Layer.prepare(name, layers, function(painter) {
    painters.push(painter)
  })
  return new LSD.Layer(name, styles, painters);
};

LSD.Layer.prepare = function(name, layers, callback) {
  var properties = [], styles = {};
  for (var i = 0, layer; layer = layers[i++];) {
    var definition = LSD.Layer[layer.capitalize()];
    if (!definition ) continue;
    var properties = definition.properties && Object.clone(definition.properties);
    if (!properties) continue;
    definition = Object.append({styles: {}, keys: []}, definition);
    var prefix = definition.prefix;
    if (prefix === false || layer == name) prefix = name;
    else if (!prefix) prefix = name + layer.capitalize();
    var length = 0;
    for (var property in properties) length++
    var simple = (length == 1);
    Object.each(properties, function(value, property) {
      if (property == layer) {
        if (simple) var style = prefix
        else return;
      } else var style = prefix + property.capitalize()
      definition.styles[style] = styles[style] = Property.compile(value, properties);
      definition.keys.push(style);
    });
    var shorthand = properties[layer];
    if (shorthand && !simple) {
      var style = (layer == name) ? name : name + layer.capitalize();
      if (length) {
        for (var j = 0, k = 0, l = 0, prop; prop = shorthand[j]; j++) {
          if (!prop.push) { 
            if (properties[prop]) {
              shorthand[j] = prefix + prop.capitalize();
              k++
            }
          } else for (var m = 0, sub; sub = prop[m]; m++) {
            if (properties[sub]) {
              prop[m] = prefix + sub.capitalize();
              l++;
            }
          }
        }
      }
      definition.styles[style] = styles[style] = Property.compile(((l > 0 && (k > 0 || j == 1)) ) ? [shorthand] : shorthand, styles);
      definition.shorthand = style;
    }
    if (definition.onCompile) definition.onCompile(name);
    if (callback) callback(definition);
  }
  for (var property in styles) {
    Styles[property] = styles[property];
    Map[property] = name;
  }
  return styles;
}

LSD.Layer.get = function(name) {
  var key = name//Array.flatten(arguments).join('');
  if (Cache[key]) return Cache[key];
  else return (Cache[key] = LSD.Layer.generate.apply(LSD.Layer, arguments))
}

}();
/*
---
 
script: Layers.js
 
description: Make widget use layers for all the SVG
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Trait
  - LSD.Layer
  - LSD.Module.Styles

provides: 
  - LSD.Module.Layers
 
...
*/


!function() {

LSD.Module.Layers = new Class({
  initializers: {
    layers: function() {
      this.offset = {
        inside: {},
        outside: {},
        padding: {}
      };
      this.shapes = {};
      this.style.layers = {};
      this.layers = {}
    }
  },

  addLayer: function(name, value) {
    var slots = this.style.layers || (this.style.layers = {});
    var layer = this.layers[name] = LSD.Layer.get(name, Array.concat(value));
    for (var i = 0, painter; painter = layer.painters[i++];) {
      for (var group = painter.keys, j = 0, property; property = group[j++];) {
        if (!slots[property]) slots[property] = [];
        slots[property].push(name);
      }
    }
  },
  
  removeLayer: function(name, value) {
    var slots = this.style.layers || (this.style.layers = {});
    var layer = this.layers[name] = LSD.Layer.get(name, Array.concat(value));
    for (var i = 0, painter; painter = layer.painters[i++];) {
      for (var group = painter.keys, j = 0, property; property = group[j++];) {
        if (slots[property]) slots[property].erase(name);
      }
    }
  },
  
  renderLayers: function(dirty) {
    var updated = new FastArray, style = this.style, layers = style.layers, offset = this.offset;
    for (var property in dirty) if (layers[property]) updated.push.apply(updated, layers[property]);
    
    var result = {};
    for (var name in this.layers) {
      if (!updated[name]) continue;
      var layer = this.layers[name];
      var sizes = Object.append({box: this.size}, {size: Object.append({}, this.size)});
      result = layer.draw(this, Object.append(result.inside ? {inside: result.inside, outside: result.outside} : {}, sizes))
    }
    var inside  = offset.inside  = Object.append({left: 0, right: 0, top: 0, bottom: 0}, result.inside);
    var outside = offset.outside = Object.append({left: 0, right: 0, top: 0, bottom: 0}, result.outside);
    offset.shape = /*this.shape.getOffset ? this.shape.getOffset(style.current) : */{left: 0, right: 0, top: 0, bottom: 0};
    
    for (var name in this.shapes) {
      var layer = this.shapes[name];
      if (!layer) continue;
      if (!layer.injected) {
        for (var layers = Object.keys(this.layers), i = layers.indexOf(layer.name), key, next; key = layers[++i];) {
          if ((next = this.layers[key]) && next.injected && next.shape) {
            layer.inject(next.shape, 'before');
            break;
          }
        }
        if (!layer.injected) layer.inject(this.getCanvas());
        layer.injected = true;
      }
    }
  },
  
  render: function() {
    var style = this.style, last = style.last, old = style.size, paint = style.paint, changed = style.changed;
    this.parent.apply(this, arguments);
    this.setSize(this.getStyles('height', 'width'));
    var size = this.size;
    if (size && (!old || (old.width != size.width || old.height != size.height))) {
      this.fireEvent('resize', [size, old]);
      changed = paint;
    }
    if (Object.getLength(changed) > 0) this.renderLayers(changed);
    style.changed = {};
    style.last = Object.append({}, paint);
    style.size = Object.append({}, size);
    this.renderOffsets();
  },
  
  renderStyles: function() {
    this.parent.apply(this, arguments);
    var style = this.style, current = style.current;
    Object.append(this.offset, {
      padding: {left: current.paddingLeft || 0, right: current.paddingRight || 0, top: current.paddingTop || 0, bottom: current.paddingBottom || 0},
      margin: {left: current.marginLeft || 0, right: current.marginRight || 0, top: current.marginTop || 0, bottom: current.marginBottom || 0}
    });
  },
  
  renderOffsets: function() {
    var element = this.element,
        current = this.style.current, 
        offset  = this.offset,         // Offset that is provided by:
        inside  = offset.inside,       // layers, inside the widget
        outside = offset.outside,      // layers, outside of the widget
        shape   = offset.shape,        // shape
        padding = offset.padding,      // padding style declarations
        margin  = offset.margin,       // margin style declarations
        inner   = {},                  // all inside offsets above, converted to padding
        outer   = {};                  // all outside offsets above, converted to margin
        
    for (var property in inside) {
      var cc = property.capitalize();
      if (offset.inner) var last = offset.inner[property];
      inner[property] = padding[property] + inside[property] + shape[property] + outside[property];
      if (last != null ? last != inner[property] : inner[property]) element.style['padding' + cc] = inner[property] + 'px';
      if (offset.outer) last = offset.outer[property];
      outer[property] = margin[property] - outside[property];
      if (last != null ? last != outer[property] : outer[property]) element.style['margin' + cc] = outer[property] + 'px';
    }
    if (inside) Object.append(offset, {inner: inner, outer: outer});
  }
});

if (!LSD.Layers) LSD.Layers =  {
  shadow:     ['size', 'radius', 'shape', 'shadow'],
  stroke:     [        'radius', 'stroke', 'shape', 'fill'],
  background: ['size', 'radius', 'stroke', 'offset', 'shape', 'color'],
  foreground: ['size', 'radius', 'stroke', 'offset', 'shape', 'color'],
  reflection: ['size', 'radius', 'stroke', 'offset', 'shape', 'color'],
  icon:       ['size', 'scale', 'color', 'stroke', 'offset', 'shape', 'position','shadow'],
  glyph:      ['size', 'scale', 'color', 'stroke', 'offset', 'shape', 'position', 'shadow']
};

for (var layer in LSD.Layers) LSD.Layer.get(layer, LSD.Layers[layer]);

LSD.Options.layers = {
  add: 'addLayer',
  remove: 'removeLayer',
  iterate: true,
  process: function(value) {
    return (value === true) ? LSD.Layers : value;
  }
};

}();

/*
---

script: Proxies.js

description: All visual rendering aspects under one umbrella

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.Layers
  - LSD.Module.Render
  - LSD.Module.Shape

provides: 
  - LSD.Module.Graphics

...
*/


LSD.Module.Graphics = new Class({
  Implements: [
    LSD.Module.Layers, 
    LSD.Module.Render, 
    LSD.Module.Shape
  ]
});
/*
---

name: Element.Dimensions

description: Contains methods to work with size, scroll, or positioning of Elements and the window object.

license: MIT-style license.

credits:
  - Element positioning based on the [qooxdoo](http://qooxdoo.org/) code and smart browser fixes, [LGPL License](http://www.gnu.org/licenses/lgpl.html).
  - Viewport dimensions based on [YUI](http://developer.yahoo.com/yui/) code, [BSD License](http://developer.yahoo.com/yui/license.html).

requires: [Element, Element.Style]

provides: [Element.Dimensions]

...
*/

(function(){

var element = document.createElement('div'),
	child = document.createElement('div');
element.style.height = '0';
element.appendChild(child);
var brokenOffsetParent = (child.offsetParent === element);
element = child = null;

var isOffset = function(el){
	return styleString(el, 'position') != 'static' || isBody(el);
};

var isOffsetStatic = function(el){
	return isOffset(el) || (/^(?:table|td|th)$/i).test(el.tagName);
};

Element.implement({

	scrollTo: function(x, y){
		if (isBody(this)){
			this.getWindow().scrollTo(x, y);
		} else {
			this.scrollLeft = x;
			this.scrollTop = y;
		}
		return this;
	},

	getSize: function(){
		if (isBody(this)) return this.getWindow().getSize();
		return {x: this.offsetWidth, y: this.offsetHeight};
	},

	getScrollSize: function(){
		if (isBody(this)) return this.getWindow().getScrollSize();
		return {x: this.scrollWidth, y: this.scrollHeight};
	},

	getScroll: function(){
		if (isBody(this)) return this.getWindow().getScroll();
		return {x: this.scrollLeft, y: this.scrollTop};
	},

	getScrolls: function(){
		var element = this.parentNode, position = {x: 0, y: 0};
		while (element && !isBody(element)){
			position.x += element.scrollLeft;
			position.y += element.scrollTop;
			element = element.parentNode;
		}
		return position;
	},

	getOffsetParent: brokenOffsetParent ? function(){
		var element = this;
		if (isBody(element) || styleString(element, 'position') == 'fixed') return null;

		var isOffsetCheck = (styleString(element, 'position') == 'static') ? isOffsetStatic : isOffset;
		while ((element = element.parentNode)){
			if (isOffsetCheck(element)) return element;
		}
		return null;
	} : function(){
		var element = this;
		if (isBody(element) || styleString(element, 'position') == 'fixed') return null;

		try {
			return element.offsetParent;
		} catch(e) {}
		return null;
	},

	getOffsets: function(){
		if (this.getBoundingClientRect && !Browser.Platform.ios){
			var bound = this.getBoundingClientRect(),
				html = document.id(this.getDocument().documentElement),
				htmlScroll = html.getScroll(),
				elemScrolls = this.getScrolls(),
				isFixed = (styleString(this, 'position') == 'fixed');

			return {
				x: bound.left.toInt() + elemScrolls.x + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y: bound.top.toInt()  + elemScrolls.y + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};
		}

		var element = this, position = {x: 0, y: 0};
		if (isBody(this)) return position;

		while (element && !isBody(element)){
			position.x += element.offsetLeft;
			position.y += element.offsetTop;

			if (Browser.firefox){
				if (!borderBox(element)){
					position.x += leftBorder(element);
					position.y += topBorder(element);
				}
				var parent = element.parentNode;
				if (parent && styleString(parent, 'overflow') != 'visible'){
					position.x += leftBorder(parent);
					position.y += topBorder(parent);
				}
			} else if (element != this && Browser.safari){
				position.x += leftBorder(element);
				position.y += topBorder(element);
			}

			element = element.offsetParent;
		}
		if (Browser.firefox && !borderBox(this)){
			position.x -= leftBorder(this);
			position.y -= topBorder(this);
		}
		return position;
	},

	getPosition: function(relative){
		if (isBody(this)) return {x: 0, y: 0};
		var offset = this.getOffsets(),
			scroll = this.getScrolls();
		var position = {
			x: offset.x - scroll.x,
			y: offset.y - scroll.y
		};
		
		if (relative && (relative = document.id(relative))){
			var relativePosition = relative.getPosition();
			return {x: position.x - relativePosition.x - leftBorder(relative), y: position.y - relativePosition.y - topBorder(relative)};
		}
		return position;
	},

	getCoordinates: function(element){
		if (isBody(this)) return this.getWindow().getCoordinates();
		var position = this.getPosition(element),
			size = this.getSize();
		var obj = {
			left: position.x,
			top: position.y,
			width: size.x,
			height: size.y
		};
		obj.right = obj.left + obj.width;
		obj.bottom = obj.top + obj.height;
		return obj;
	},

	computePosition: function(obj){
		return {
			left: obj.x - styleNumber(this, 'margin-left'),
			top: obj.y - styleNumber(this, 'margin-top')
		};
	},

	setPosition: function(obj){
		return this.setStyles(this.computePosition(obj));
	}

});


[Document, Window].invoke('implement', {

	getSize: function(){
		var doc = getCompatElement(this);
		return {x: doc.clientWidth, y: doc.clientHeight};
	},

	getScroll: function(){
		var win = this.getWindow(), doc = getCompatElement(this);
		return {x: win.pageXOffset || doc.scrollLeft, y: win.pageYOffset || doc.scrollTop};
	},

	getScrollSize: function(){
		var doc = getCompatElement(this),
			min = this.getSize(),
			body = this.getDocument().body;

		return {x: Math.max(doc.scrollWidth, body.scrollWidth, min.x), y: Math.max(doc.scrollHeight, body.scrollHeight, min.y)};
	},

	getPosition: function(){
		return {x: 0, y: 0};
	},

	getCoordinates: function(){
		var size = this.getSize();
		return {top: 0, left: 0, bottom: size.y, right: size.x, height: size.y, width: size.x};
	}

});

// private methods

var styleString = Element.getComputedStyle;

function styleNumber(element, style){
	return styleString(element, style).toInt() || 0;
}

function borderBox(element){
	return styleString(element, '-moz-box-sizing') == 'border-box';
}

function topBorder(element){
	return styleNumber(element, 'border-top-width');
}

function leftBorder(element){
	return styleNumber(element, 'border-left-width');
}

function isBody(element){
	return (/^(?:body|html)$/i).test(element.tagName);
}

function getCompatElement(element){
	var doc = element.getDocument();
	return (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
}

})();

//aliases
Element.alias({position: 'setPosition'}); //compatability

[Window, Document, Element].invoke('implement', {

	getHeight: function(){
		return this.getSize().y;
	},

	getWidth: function(){
		return this.getSize().x;
	},

	getScrollTop: function(){
		return this.getScroll().y;
	},

	getScrollLeft: function(){
		return this.getScroll().x;
	},

	getScrollHeight: function(){
		return this.getScrollSize().y;
	},

	getScrollWidth: function(){
		return this.getScrollSize().x;
	},

	getTop: function(){
		return this.getPosition().y;
	},

	getLeft: function(){
		return this.getPosition().x;
	}

});

/*
---

script: Drag.js

name: Drag

description: The base Drag Class. Can be used to drag and resize Elements using mouse events.

license: MIT-style license

authors:
  - Valerio Proietti
  - Tom Occhinno
  - Jan Kassens

requires:
  - Core/Events
  - Core/Options
  - Core/Element.Event
  - Core/Element.Style
  - Core/Element.Dimensions
  - /MooTools.More

provides: [Drag]
...

*/

var Drag = new Class({

	Implements: [Events, Options],

	options: {/*
		onBeforeStart: function(thisElement){},
		onStart: function(thisElement, event){},
		onSnap: function(thisElement){},
		onDrag: function(thisElement, event){},
		onCancel: function(thisElement){},
		onComplete: function(thisElement, event){},*/
		snap: 6,
		unit: 'px',
		grid: false,
		style: true,
		limit: false,
		handle: false,
		invert: false,
		preventDefault: false,
		stopPropagation: false,
		modifiers: {x: 'left', y: 'top'}
	},

	initialize: function(){
		var params = Array.link(arguments, {
			'options': Type.isObject,
			'element': function(obj){
				return obj != null;
			}
		});

		this.element = document.id(params.element);
		this.document = this.element.getDocument();
		this.setOptions(params.options || {});
		var htype = typeOf(this.options.handle);
		this.handles = ((htype == 'array' || htype == 'collection') ? $$(this.options.handle) : document.id(this.options.handle)) || this.element;
		this.mouse = {'now': {}, 'pos': {}};
		this.value = {'start': {}, 'now': {}};

		this.selection = (Browser.ie) ? 'selectstart' : 'mousedown';


		if (Browser.ie && !Drag.ondragstartFixed){
			document.ondragstart = Function.from(false);
			Drag.ondragstartFixed = true;
		}

		this.bound = {
			start: this.start.bind(this),
			check: this.check.bind(this),
			drag: this.drag.bind(this),
			stop: this.stop.bind(this),
			cancel: this.cancel.bind(this),
			eventStop: Function.from(false)
		};
		this.attach();
	},

	attach: function(){
		this.handles.addEvent('mousedown', this.bound.start);
		return this;
	},

	detach: function(){
		this.handles.removeEvent('mousedown', this.bound.start);
		return this;
	},

	start: function(event){
		var options = this.options;

		if (event.rightClick) return;

		if (options.preventDefault) event.preventDefault();
		if (options.stopPropagation) event.stopPropagation();
		this.mouse.start = event.page;

		this.fireEvent('beforeStart', this.element);

		var limit = options.limit;
		this.limit = {x: [], y: []};

		var z, coordinates;
		for (z in options.modifiers){
			if (!options.modifiers[z]) continue;

			var style = this.element.getStyle(options.modifiers[z]);

			// Some browsers (IE and Opera) don't always return pixels.
			if (style && !style.match(/px$/)){
				if (!coordinates) coordinates = this.element.getCoordinates(this.element.getOffsetParent());
				style = coordinates[options.modifiers[z]];
			}

			if (options.style) this.value.now[z] = (style || 0).toInt();
			else this.value.now[z] = this.element[options.modifiers[z]];

			if (options.invert) this.value.now[z] *= -1;

			this.mouse.pos[z] = event.page[z] - this.value.now[z];

			if (limit && limit[z]){
				var i = 2;
				while (i--){
					var limitZI = limit[z][i];
					if (limitZI || limitZI === 0) this.limit[z][i] = (typeof limitZI == 'function') ? limitZI() : limitZI;
				}
			}
		}

		if (typeOf(this.options.grid) == 'number') this.options.grid = {
			x: this.options.grid,
			y: this.options.grid
		};

		var events = {
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		};
		events[this.selection] = this.bound.eventStop;
		this.document.addEvents(events);
	},

	check: function(event){
		if (this.options.preventDefault) event.preventDefault();
		var distance = Math.round(Math.sqrt(Math.pow(event.page.x - this.mouse.start.x, 2) + Math.pow(event.page.y - this.mouse.start.y, 2)));
		if (distance > this.options.snap){
			this.cancel();
			this.document.addEvents({
				mousemove: this.bound.drag,
				mouseup: this.bound.stop
			});
			this.fireEvent('start', [this.element, event]).fireEvent('snap', this.element);
		}
	},

	drag: function(event){
		var options = this.options;

		if (options.preventDefault) event.preventDefault();
		this.mouse.now = event.page;

		for (var z in options.modifiers){
			if (!options.modifiers[z]) continue;
			this.value.now[z] = this.mouse.now[z] - this.mouse.pos[z];

			if (options.invert) this.value.now[z] *= -1;

			if (options.limit && this.limit[z]){
				if ((this.limit[z][1] || this.limit[z][1] === 0) && (this.value.now[z] > this.limit[z][1])){
					this.value.now[z] = this.limit[z][1];
				} else if ((this.limit[z][0] || this.limit[z][0] === 0) && (this.value.now[z] < this.limit[z][0])){
					this.value.now[z] = this.limit[z][0];
				}
			}

			if (options.grid[z]) this.value.now[z] -= ((this.value.now[z] - (this.limit[z][0]||0)) % options.grid[z]);

			if (options.style) this.element.setStyle(options.modifiers[z], this.value.now[z] + options.unit);
			else this.element[options.modifiers[z]] = this.value.now[z];
		}

		this.fireEvent('drag', [this.element, event]);
	},

	cancel: function(event){
		this.document.removeEvents({
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		});
		if (event){
			this.document.removeEvent(this.selection, this.bound.eventStop);
			this.fireEvent('cancel', this.element);
		}
	},

	stop: function(event){
		var events = {
			mousemove: this.bound.drag,
			mouseup: this.bound.stop
		};
		events[this.selection] = this.bound.eventStop;
		this.document.removeEvents(events);
		if (event) this.fireEvent('complete', [this.element, event]);
	}

});

Element.implement({

	makeResizable: function(options){
		var drag = new Drag(this, Object.merge({
			modifiers: {
				x: 'width',
				y: 'height'
			}
		}, options));

		this.store('resizer', drag);
		return drag.addEvent('drag', function(){
			this.fireEvent('resize', drag);
		}.bind(this));
	}

});

/*
---
 
script: Drag.Limits.js
 
description: A set of function to easily cap Drag's limit
 
license: MIT-style license.
 
requires:
- More/Drag

provides: [Drag.Limits]
 
...
*/

Drag.implement({
  setMaxX: function(x) {
    var limit = this.options.limit;
    limit.x[1] = x//Math.max(x, limit.x[1]);
    limit.x[0] = Math.min(limit.x[0], limit.x[1]);
  },
  
  setMaxY: function(y) {
    var limit = this.options.limit;
    limit.y[1] = y//Math.max(y, limit.y[1]);
    limit.y[0] = Math.min(limit.y[0], limit.y[1]);
  },
  
  setMinX: function(x) {
    var limit = this.options.limit;
    limit.x[0] = x//Math.min(x, limit.x[0]);
    limit.x[1] = Math.max(limit.x[1], limit.x[0]);
  },
  
  setMinY: function(y) {
    var limit = this.options.limit;
    limit.y[0] = y//Math.min(y, limit.y[0]);
    limit.y[1] = Math.max(limit.y[1], limit.y[0]);
  }
});

/*
---

script: Element.Measure.js

name: Element.Measure

description: Extends the Element native object to include methods useful in measuring dimensions.

credits: "Element.measure / .expose methods by Daniel Steigerwald License: MIT-style license. Copyright: Copyright (c) 2008 Daniel Steigerwald, daniel.steigerwald.cz"

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Element.Style
  - Core/Element.Dimensions
  - /MooTools.More

provides: [Element.Measure]

...
*/

(function(){

var getStylesList = function(styles, planes){
	var list = [];
	Object.each(planes, function(directions){
		Object.each(directions, function(edge){
			styles.each(function(style){
				list.push(style + '-' + edge + (style == 'border' ? '-width' : ''));
			});
		});
	});
	return list;
};

var calculateEdgeSize = function(edge, styles){
	var total = 0;
	Object.each(styles, function(value, style){
		if (style.test(edge)) total = total + value.toInt();
	});
	return total;
};

var isVisible = function(el){
	return !!(!el || el.offsetHeight || el.offsetWidth);
};


Element.implement({

	measure: function(fn){
		if (isVisible(this)) return fn.call(this);
		var parent = this.getParent(),
			toMeasure = [];
		while (!isVisible(parent) && parent != document.body){
			toMeasure.push(parent.expose());
			parent = parent.getParent();
		}
		var restore = this.expose(),
			result = fn.call(this);
		restore();
		toMeasure.each(function(restore){
			restore();
		});
		return result;
	},

	expose: function(){
		if (this.getStyle('display') != 'none') return function(){};
		var before = this.style.cssText;
		this.setStyles({
			display: 'block',
			position: 'absolute',
			visibility: 'hidden'
		});
		return function(){
			this.style.cssText = before;
		}.bind(this);
	},

	getDimensions: function(options){
		options = Object.merge({computeSize: false}, options);
		var dim = {x: 0, y: 0};

		var getSize = function(el, options){
			return (options.computeSize) ? el.getComputedSize(options) : el.getSize();
		};

		var parent = this.getParent('body');

		if (parent && this.getStyle('display') == 'none'){
			dim = this.measure(function(){
				return getSize(this, options);
			});
		} else if (parent){
			try { //safari sometimes crashes here, so catch it
				dim = getSize(this, options);
			}catch(e){}
		}

		return Object.append(dim, (dim.x || dim.x === 0) ? {
				width: dim.x,
				height: dim.y
			} : {
				x: dim.width,
				y: dim.height
			}
		);
	},

	getComputedSize: function(options){
		//<1.2compat>
		//legacy support for my stupid spelling error
		if (options && options.plains) options.planes = options.plains;
		//</1.2compat>

		options = Object.merge({
			styles: ['padding','border'],
			planes: {
				height: ['top','bottom'],
				width: ['left','right']
			},
			mode: 'both'
		}, options);

		var styles = {},
			size = {width: 0, height: 0},
			dimensions;

		if (options.mode == 'vertical'){
			delete size.width;
			delete options.planes.width;
		} else if (options.mode == 'horizontal'){
			delete size.height;
			delete options.planes.height;
		}

		getStylesList(options.styles, options.planes).each(function(style){
			styles[style] = this.getStyle(style).toInt();
		}, this);

		Object.each(options.planes, function(edges, plane){

			var capitalized = plane.capitalize(),
				style = this.getStyle(plane);

			if (style == 'auto' && !dimensions) dimensions = this.getDimensions();

			style = styles[plane] = (style == 'auto') ? dimensions[plane] : style.toInt();
			size['total' + capitalized] = style;

			edges.each(function(edge){
				var edgesize = calculateEdgeSize(edge, styles);
				size['computed' + edge.capitalize()] = edgesize;
				size['total' + capitalized] += edgesize;
			});

		}, this);

		return Object.append(size, styles);
	}

});

})();

/*
---

script: Slider.js

name: Slider

description: Class for creating horizontal and vertical slider controls.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Element.Dimensions
  - /Class.Binds
  - /Drag
  - /Element.Measure

provides: [Slider]

...
*/

var Slider = new Class({

	Implements: [Events, Options],

	Binds: ['clickedElement', 'draggedKnob', 'scrolledElement'],

	options: {/*
		onTick: function(intPosition){},
		onChange: function(intStep){},
		onComplete: function(strStep){},*/
		onTick: function(position){
			this.setKnobPosition(position);
		},
		initialStep: 0,
		snap: false,
		offset: 0,
		range: false,
		wheel: false,
		steps: 100,
		mode: 'horizontal'
	},

	initialize: function(element, knob, options){
		this.setOptions(options);
		options = this.options;
		this.element = document.id(element);
		knob = this.knob = document.id(knob);
		this.previousChange = this.previousEnd = this.step = -1;

		var limit = {},
			modifiers = {x: false, y: false};

		switch (options.mode){
			case 'vertical':
				this.axis = 'y';
				this.property = 'top';
				this.offset = 'offsetHeight';
				break;
			case 'horizontal':
				this.axis = 'x';
				this.property = 'left';
				this.offset = 'offsetWidth';
		}

		this.setSliderDimensions();
		this.setRange(options.range);

		if (knob.getStyle('position') == 'static') knob.setStyle('position', 'relative');
		knob.setStyle(this.property, -options.offset);
		modifiers[this.axis] = this.property;
		limit[this.axis] = [-options.offset, this.full - options.offset];

		var dragOptions = {
			snap: 0,
			limit: limit,
			modifiers: modifiers,
			onDrag: this.draggedKnob,
			onStart: this.draggedKnob,
			onBeforeStart: (function(){
				this.isDragging = true;
			}).bind(this),
			onCancel: function(){
				this.isDragging = false;
			}.bind(this),
			onComplete: function(){
				this.isDragging = false;
				this.draggedKnob();
				this.end();
			}.bind(this)
		};
		if (options.snap) this.setSnap(dragOptions);

		this.drag = new Drag(knob, dragOptions);
		this.attach();
		if (options.initialStep != null) this.set(options.initialStep);
	},

	attach: function(){
		this.element.addEvent('mousedown', this.clickedElement);
		if (this.options.wheel) this.element.addEvent('mousewheel', this.scrolledElement);
		this.drag.attach();
		return this;
	},

	detach: function(){
		this.element.removeEvent('mousedown', this.clickedElement)
			.removeEvent('mousewheel', this.scrolledElement);
		this.drag.detach();
		return this;
	},

	autosize: function(){
		this.setSliderDimensions()
			.setKnobPosition(this.toPosition(this.step));
		this.drag.options.limit[this.axis] = [-this.options.offset, this.full - this.options.offset];
		if (this.options.snap) this.setSnap();
		return this;
	},

	setSnap: function(options){
		if (!options) options = this.drag.options;
		options.grid = Math.ceil(this.stepWidth);
		options.limit[this.axis][1] = this.full;
		return this;
	},

	setKnobPosition: function(position){
		if (this.options.snap) position = this.toPosition(this.step);
		this.knob.setStyle(this.property, position);
		return this;
	},

	setSliderDimensions: function(){
		this.full = this.element.measure(function(){
			this.half = this.knob[this.offset] / 2;
			return this.element[this.offset] - this.knob[this.offset] + (this.options.offset * 2);
		}.bind(this));
		return this;
	},

	set: function(step){
		if (!((this.range > 0) ^ (step < this.min))) step = this.min;
		if (!((this.range > 0) ^ (step > this.max))) step = this.max;

		this.step = Math.round(step);
		return this.checkStep()
			.fireEvent('tick', this.toPosition(this.step))
			.end();
	},

	setRange: function(range, pos){
		this.min = Array.pick([range[0], 0]);
		this.max = Array.pick([range[1], this.options.steps]);
		this.range = this.max - this.min;
		this.steps = this.options.steps || this.full;
		this.stepSize = Math.abs(this.range) / this.steps;
		this.stepWidth = this.stepSize * this.full / Math.abs(this.range);
		if (range) this.set(Array.pick([pos, this.step]).floor(this.min).max(this.max));
		return this;
	},

	clickedElement: function(event){
		if (this.isDragging || event.target == this.knob) return;

		var dir = this.range < 0 ? -1 : 1,
			position = event.page[this.axis] - this.element.getPosition()[this.axis] - this.half;

		position = position.limit(-this.options.offset, this.full - this.options.offset);

		this.step = Math.round(this.min + dir * this.toStep(position));

		this.checkStep()
			.fireEvent('tick', position)
			.end();
	},

	scrolledElement: function(event){
		var mode = (this.options.mode == 'horizontal') ? (event.wheel < 0) : (event.wheel > 0);
		this.set(this.step + (mode ? -1 : 1) * this.stepSize);
		event.stop();
	},

	draggedKnob: function(){
		var dir = this.range < 0 ? -1 : 1,
			position = this.drag.value.now[this.axis];

		position = position.limit(-this.options.offset, this.full -this.options.offset);

		this.step = Math.round(this.min + dir * this.toStep(position));
		this.checkStep();
	},

	checkStep: function(){
		var step = this.step;
		if (this.previousChange != step){
			this.previousChange = step;
			this.fireEvent('change', step);
		}
		return this;
	},

	end: function(){
		var step = this.step;
		if (this.previousEnd !== step){
			this.previousEnd = step;
			this.fireEvent('complete', step + '');
		}
		return this;
	},

	toStep: function(position){
		var step = (position + this.options.offset) * this.stepSize / this.full * this.steps;
		return this.options.steps ? Math.round(step -= step % this.stepSize) : step;
	},

	toPosition: function(step){
		return (this.full * Math.abs(this.min - step)) / (this.steps * this.stepSize) - this.options.offset;
	}

});

/*
---
 
script: Slider.js
 
description: Methods to update slider without reinitializing the thing
 
license: MIT-style license.
 
requires:
- Drag.Limits
- More/Slider

provides: [Slider.prototype.update]
 
...
*/


Slider.implement({
  update: function() {
		var offset = (this.options.mode == 'vertical') ?  'offsetHeight' : 'offsetWidth'
		this.half = this.knob[offset] / 2; 
		this.full =  this.element[offset] - this.knob[offset] + (this.options.offset * 2); 
		
		//this.setRange(this.options.range);

		this.knob.setStyle(this.property, this.toPosition(this.step));
		var X = this.axis.capitalize();
		this.drag['setMin' + X](- this.options.offset)
		this.drag['setMax' + X](this.full - this.options.offset)
  }
});
/*
---
 
script: Slider.js
 
description: Because sometimes slider is the answer
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
  - More/Slider
  - Ext/Slider.prototype.update
  - Ext/Class.hasParent

provides: 
  - LSD.Trait.Slider
 
...
*/

LSD.Trait.Slider = new Class({
  
  options: {
    actions: {
      slider: {
        enable: function() {
          if (!this.slider) this.getSlider();
          else this.slider.attach();
        },

        disable: function() {
          if (this.slider) this.slider.detach()
        }
      }
    },
    events: {
      parent: {
        resize: 'onParentResize'
      },
      slider: {}
    },
    slider: {},
    value: 0,
    mode: 'horizontal',
  },
  
  onParentResize: function(current, old) {
    if (this.slider) this.slider.update();
  },
  
  getSlider: Macro.getter('slider', function (update) {
    var slider = new Slider(document.id(this.getTrack()), document.id(this.getTrackThumb()), Object.merge(this.options.slider, {
      mode: this.options.mode
    })).set(parseFloat(this.options.value));
    slider.addEvent('change', this.onSet.bind(this));
    this.fireEvent('register', ['slider', slider]);
    return slider;
  }),
  
  onSet: Macro.defaults(function() {
    return true;
  }),
  
  getTrack: Macro.defaults(function() {
    return this
  }),
  
  getTrackThumb: Macro.defaults(function() {
    return this.thumb;
  }),
  
  increment: function() {
    this.slider.set((this.slider.step || 0) + 10)
  },
  
  decrement: function() {
    this.slider.set((this.slider.step || 0) - 10)
  }
  
});

Slider = new Class({
  Extends: Slider,
  
  initialize: function() {
    (this.Binds.push ? this.Binds : [this.Binds]).each(function(name){
      var original = this[name];
      if (original) this[name] = original.bind(this);
    }, this);
    return this.parent.apply(this, arguments);
  }
})
/*
---

name: Fx.CSS

description: Contains the CSS animation logic. Used by Fx.Tween, Fx.Morph, Fx.Elements.

license: MIT-style license.

requires: [Fx, Element.Style]

provides: Fx.CSS

...
*/

Fx.CSS = new Class({

	Extends: Fx,

	//prepares the base from/to object

	prepare: function(element, property, values){
		values = Array.from(values);
		if (values[1] == null){
			values[1] = values[0];
			values[0] = element.getStyle(property);
		}
		var parsed = values.map(this.parse);
		return {from: parsed[0], to: parsed[1]};
	},

	//parses a value into an array

	parse: function(value){
		value = Function.from(value)();
		value = (typeof value == 'string') ? value.split(' ') : Array.from(value);
		return value.map(function(val){
			val = String(val);
			var found = false;
			Object.each(Fx.CSS.Parsers, function(parser, key){
				if (found) return;
				var parsed = parser.parse(val);
				if (parsed || parsed === 0) found = {value: parsed, parser: parser};
			});
			found = found || {value: val, parser: Fx.CSS.Parsers.String};
			return found;
		});
	},

	//computes by a from and to prepared objects, using their parsers.

	compute: function(from, to, delta){
		var computed = [];
		(Math.min(from.length, to.length)).times(function(i){
			computed.push({value: from[i].parser.compute(from[i].value, to[i].value, delta), parser: from[i].parser});
		});
		computed.$family = Function.from('fx:css:value');
		return computed;
	},

	//serves the value as settable

	serve: function(value, unit){
		if (typeOf(value) != 'fx:css:value') value = this.parse(value);
		var returned = [];
		value.each(function(bit){
			returned = returned.concat(bit.parser.serve(bit.value, unit));
		});
		return returned;
	},

	//renders the change to an element

	render: function(element, property, value, unit){
		element.setStyle(property, this.serve(value, unit));
	},

	//searches inside the page css to find the values for a selector

	search: function(selector){
		if (Fx.CSS.Cache[selector]) return Fx.CSS.Cache[selector];
		var to = {}, selectorTest = new RegExp('^' + selector.escapeRegExp() + '$');
		Array.each(document.styleSheets, function(sheet, j){
			var href = sheet.href;
			if (href && href.contains('://') && !href.contains(document.domain)) return;
			var rules = sheet.rules || sheet.cssRules;
			Array.each(rules, function(rule, i){
				if (!rule.style) return;
				var selectorText = (rule.selectorText) ? rule.selectorText.replace(/^\w+/, function(m){
					return m.toLowerCase();
				}) : null;
				if (!selectorText || !selectorTest.test(selectorText)) return;
				Object.each(Element.Styles, function(value, style){
					if (!rule.style[style] || Element.ShortStyles[style]) return;
					value = String(rule.style[style]);
					to[style] = ((/^rgb/).test(value)) ? value.rgbToHex() : value;
				});
			});
		});
		return Fx.CSS.Cache[selector] = to;
	}

});

Fx.CSS.Cache = {};

Fx.CSS.Parsers = {

	Color: {
		parse: function(value){
			if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
			return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
		},
		compute: function(from, to, delta){
			return from.map(function(value, i){
				return Math.round(Fx.compute(from[i], to[i], delta));
			});
		},
		serve: function(value){
			return value.map(Number);
		}
	},

	Number: {
		parse: parseFloat,
		compute: Fx.compute,
		serve: function(value, unit){
			return (unit) ? value + unit : value;
		}
	},

	String: {
		parse: Function.from(false),
		compute: function(zero, one){
			return one;
		},
		serve: function(zero){
			return zero;
		}
	}

};

//<1.2compat>

Fx.CSS.Parsers = new Hash(Fx.CSS.Parsers);

//</1.2compat>

/*
---

name: Fx.Tween

description: Formerly Fx.Style, effect to transition any CSS property for an element.

license: MIT-style license.

requires: Fx.CSS

provides: [Fx.Tween, Element.fade, Element.highlight]

...
*/

Fx.Tween = new Class({

	Extends: Fx.CSS,

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);
	},

	set: function(property, now){
		if (arguments.length == 1){
			now = property;
			property = this.property || this.options.property;
		}
		this.render(this.element, property, now, this.options.unit);
		return this;
	},

	start: function(property, from, to){
		if (!this.check(property, from, to)) return this;
		var args = Array.flatten(arguments);
		this.property = this.options.property || args.shift();
		var parsed = this.prepare(this.element, this.property, args);
		return this.parent(parsed.from, parsed.to);
	}

});

Element.Properties.tween = {

	set: function(options){
		this.get('tween').cancel().setOptions(options);
		return this;
	},

	get: function(){
		var tween = this.retrieve('tween');
		if (!tween){
			tween = new Fx.Tween(this, {link: 'cancel'});
			this.store('tween', tween);
		}
		return tween;
	}

};

Element.implement({

	tween: function(property, from, to){
		this.get('tween').start(arguments);
		return this;
	},

	fade: function(how){
		var fade = this.get('tween'), o = 'opacity', toggle;
		how = [how, 'toggle'].pick();
		switch (how){
			case 'in': fade.start(o, 1); break;
			case 'out': fade.start(o, 0); break;
			case 'show': fade.set(o, 1); break;
			case 'hide': fade.set(o, 0); break;
			case 'toggle':
				var flag = this.retrieve('fade:flag', this.get('opacity') == 1);
				fade.start(o, (flag) ? 0 : 1);
				this.store('fade:flag', !flag);
				toggle = true;
			break;
			default: fade.start(o, arguments);
		}
		if (!toggle) this.eliminate('fade:flag');
		return this;
	},

	highlight: function(start, end){
		if (!end){
			end = this.retrieve('highlight:original', this.getStyle('background-color'));
			end = (end == 'transparent') ? '#fff' : end;
		}
		var tween = this.get('tween');
		tween.start('background-color', start || '#ffff88', end).chain(function(){
			this.setStyle('background-color', this.retrieve('highlight:original'));
			tween.callChain();
		}.bind(this));
		return this;
	}

});

/*
---
 
script: Animation.js
 
description: Animated ways to show/hide widget
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Core/Fx.Tween
 
provides: 
  - LSD.Mixin.Animation
 
...
*/


LSD.Mixin.Animation = new Class({
  behaviour: '[animation]',
  
  options: {
    animation: {}
  },
  
  getAnimation: function() {
    if (!this.animation) {
      this.animation = this.getAnimatedElement().set('tween', this.options.animation).get('tween');
      if (this.options.animation.value) this.animation.set(this.options.animation.value);
    }
    return this.animation;
  },
  
  fade: function(how){
    return this.getAnimation().start('opacity', how == 'in' ? 1 : 0);
  },
  
  slide: function(how){
    this.getAnimatedElement().store('style:overflow', this.getAnimatedElement().getStyle('overflow'));
    this.getAnimatedElement().setStyle('overflow', 'hidden');
    return this.getAnimation().start('height', how == 'in' ? this.getAnimatedElement().scrollHeight - this.getAnimatedElement().offsetHeight : 0);
  },
  
  show: function() {
    var parent = this.parent;
    this.getAnimatedElement().setStyle('display', this.getAnimatedElement().retrieve('style:display') || 'inherit');
    this[this.attributes.animation]('in').chain(function(){
      this.getAnimatedElement().setStyle('overflow', this.getAnimatedElement().retrieve('style:overflow') || 'inherit');
      LSD.Widget.prototype.show.apply(this, arguments);
    }.bind(this));
  },
  
  hide: function(how) {
    var parent = this;
    this[this.attributes.animation]('out').chain(function(){
      this.getAnimatedElement().setStyle('overflow', this.getAnimatedElement().retrieve('style:overflow') || 'inherit');
      this.getAnimatedElement().store('style:display', this.getAnimatedElement().getStyle('display'));
      this.getAnimatedElement().setStyle('display', 'none');
      LSD.Widget.prototype.hide.apply(this, arguments);
    }.bind(this));
  },
  
  remove: function() {
    return this[this.attributes.animation]('out').chain(this.dispose.bind(this));
  },
  
  dispose: function() {
    return this.getAnimatedElement().dispose()
  },
  
  getAnimatedElement: function() {
    return this.element;
  }
  
});
/*
---
 
script: Data.js
 
description: Get/Set javascript controller into element
 
license: MIT-style license.
 
requires:
- Core/Element
 
provides: [Element.Properties.widget]
 
...
*/

Element.Properties.widget = {
  get: function(){
    var widget, element = this;
    while (element && !(widget = element.retrieve('widget'))) element = element.getParent();
    //if (widget && (element != this)) this.store('widget', widget);
    return widget;
  },
	
	set: function(options) {
	  
	}
};




/*
---
 
script: Item.js
 
description: Methods to get and set microdata closely to html5 spsec
 
license: MIT-style license.
 
requires:
- Core/Element
 
provides: [Element.prototype.getItems, Element.Properties.item, Element.Microdata]
 
...
*/
if (!Element.Item) Element.Item = {};
Element.Item = {
  walk: function(element, callback, memo, prefix) {
    var prop = element.getAttribute('itemprop');
    var scope = !!element.getAttribute('itemscope');
    if (prefix && prop) {
      if (!memo) memo = [];
      memo.push(prop);
    }
    for (var i = 0, children = element.childNodes, child; child = children[i++];) {
      if (child.nodeType != 1) continue;
      memo = Element.Item.walk.call(this, child, callback, memo, prefix);
    }
    var reference = element.getAttribute('itemref');
    if (scope && reference) {
      for (var i = 0, bits = reference.split(/\s*/), j = bits.length; i < j; i++) {
        var node = document.getElementById(bits[i]);
        if (node) Element.Item.walk.call(this, child, callback, memo, prefix);
      }
    }
    if (prefix && prop) memo.pop();
    return (prop) ? callback.call(this, element, prop, scope, memo) : memo;
  },
  
  serialize: function(element) {
    return Element.Item.walk(element, function(element, prop, scope, object) {
      if (!object) object = {};
      if (scope) {
        var obj = {};
        obj[prop] = object;
        return obj;
      } else {
        object[prop] = Element.get(element, 'itemvalue');
        return object;
      }
    })
  }
};

[Document, Element].invoke('implement', {
  getItems: function(tokens, strict) {
    var selector = '[itemscope]:not([itemprop])';
    if (tokens) selector += tokens.split(' ').map(function(type) {
      return '[itemtype' + (strict ? '~' : '*') + '=' + type + ']'
    }).join('');
    return this.getElements(selector).each(function(element) {
      return element.get('item');
    }).get('item')
  }
});

(function() {
  var push = function(properties, property, value) {
    var old = properties[property];
    if (old) { //multiple values, convert to array
      if (!old.push) properties[property] = [old];
      properties[property].push(value)
    } else {
      properties[property] = value;
    }
  }

Element.Properties.properties = {
  get: function() {
    var properties = {};
    var property = Element.getProperty(this, 'itemprop'), scope;
    if (property) {
      var scope = Element.getProperty(this, 'itemscope');
      if (!scope) {
        var value = Element.get(this, 'itemvalue');
        if (value) push(properties, property, value);
      }
    }
    for (var i = 0, child; child = this.childNodes[i++];) {
      if (child.nodeType != 1) continue;
      var values = Element.get(child, 'properties');
      for (var prop in values) push(properties, prop, values[prop]);
    }
    
    var reference = Element.getProperty(this, 'itemref');
    if (reference) {
      var selector = reference.split(' ').map(function(id) { return '#' + id}).join(', ');
      var elements = Slick.search(document.body, selector);
      for (var i = 0, reference; reference = elements[i++];) {
        var values = Element.get(reference, 'properties');
        for (var prop in values) push(properties, prop, values[prop]);
      }
    }
    
    if (scope) {
      var props = {};
      props[property] = properties;
      return props;
    }
    return properties;
  },
  
  set: function(value) {
    for (var i = 0, child; child = this.childNodes[i++];) {
      if (child.nodeType != 1) continue;
      var property = Element.getProperty(child, 'itemprop');
      if (property) Element.set(child, 'itemvalue', value[property]);
      else Element.set(child, 'properties', value)
    };
  }
};

})();

Element.Properties.item = {
  get: function() {
    if (!Element.getProperty(this, 'itemscope')) return;
    return Element.get(this, 'properties');
  },
  
  set: function(value) {
    if (!Element.getProperty(this, 'itemscope')) return;
    return Element.set(this, 'properties', value);
  }
};

(function() {

var resolve = function(url) {
  if (!url) return '';
  var img = document.createElement('img');
  img.setAttribute('src', url);
  return img.src;
}

Element.Properties.itemvalue = {
  get: function() {
    var property = this.getProperty('itemprop');
    if (!property) return;
    switch (this.get('tag')) {
      case 'meta':
        return this.get('content') || '';
      case 'input':
      case 'select':
      case 'textarea':
        return this.get('value');
      case 'audio':
      case 'embed':
      case 'iframe':
      case 'img':
      case 'source':
      case 'video':
        return resolve(this.get('src'));
      case 'a':
      case 'area':
      case 'link':
        return resolve(this.get('href'));
      case 'object':
        return resolve(this.get('data'));
      case 'time':
        var datetime = this.get('datetime');
        if (!(datetime === undefined)) return Date.parse(datetime);
      default:
        return this.getProperty('itemvalue') || this.get('text').trim();
    }
  },

  set: function(value) {
    var property = this.getProperty('itemprop');
    var scope = this.getProperty('itemscope');
    if (property === undefined) return;
    else if (scope && Object.type(value[scope])) return this.set('item', value[scope]);
    
    switch (this.get('tag')) {
      case 'meta':
        return this.set('content', value);
      case 'audio':
      case 'embed':
      case 'iframe':
      case 'img':
      case 'source':
      case 'video':
        return this.set('src', value);
      case 'a':
      case 'area':
      case 'link':
        return this.set('href', value);
      case 'object':
        return this.set('data', value);
      case 'time':
        var datetime = this.get('datetime');
        if (!(datetime === undefined)) this.set('datetime', value)
      default:
        return this.set('html', value);
    }
  }
}

})();
/*
---
 
script: List.js
 
description: Trait that makes it simple to work with a list of item (and select one of them)
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
  - Core/Element
  - Ext/Element.Properties.item
 
provides: 
  - LSD.Trait.List
 
...
*/


LSD.Trait.List = new Class({  
  options: {
    list: {
      endless: true,
      force: false,
      multiple: false,
      unselect: null
    },
    proxies: {
      container: {
        condition: function(widget) {
          return !!widget.setList
        }
      }
    },
    shortcuts: {
      previous: 'previous',
      next: 'next'
    },
    events: {
      attach: function() {
        var items = this.list && this.list.length ? this.list : this.options.list.items;
        if (items) this.setItems(items);
      }
    },
    has: {
      many: {
        items: {
          selector: ':item',
          events: {
            select: function() {
              this.listWidget.selectItem(this)
            },
            unselect: function() {
              this.listWidget.unselectItem(this);
            },
            dispose: function() {
              this.listWidget.unselectItem(this);
            }
          },
          alias: 'listWidget',
          states: {
            add: Array.fast('selected')
          },
          pseudos: Array.fast('valued'),
          callbacks: {
            'fill': 'fill',
            'empty': 'empty'
          }
        }
      }
    },
    pseudos: Array.fast('list'),
    states: {
      empty: true
    }
  },
  
  initialize: function() {
    this.parent.apply(this, arguments);
    this.setItems(this.options.items || this.items);
  },
  
  selectItem: function(item) {
    if (!(item = this.getItem(item)) && this.options.list.force) return false;
    var unselect = (this.options.list.unselect !== null) ? this.options.list.unselect : !this.options.list.multiple;
    var selected = this.selectedItem;
    if (unselect && (selected != item) && selected && selected.unselect) this.unselectItem(selected);
    this.setSelectedItem.apply(this, arguments); 
    this.fireEvent('set', [item, this.getItemIndex(item)]);
    item.select();
    return item;
  },
  
  unselectItem: function(item) {
    if (!(item = this.getItem(item)) || !this.isItemSelected(item)) return false;
    if (item.unselect) item.unselect();
    this.unsetSelectedItem.apply(this, arguments);
    this.fireEvent('unset', [item, this.getItemIndex(item)]);
    delete item;
  },
  
  setSelectedItem: function(item, type) {
    var property = (type || 'selected') + 'Item';
    if (this.options.list.multiple)  {
      property += 's';
      if (!this[property]) this[property] = [];
      this[property].push(item);
    } else this[property] = item
  },
  
  unsetSelectedItem: function(item, type) {
    var property = (type || 'selected') + 'Item';
    if (this.options.list.multiple)  {
      property += 's';
      if (this[property]) this[property].erase(item);
    } else delete this[property]
  },

  getSelectedItem: function() {
    return this.selectedItem || (this.selectedItems ? this.selectedItems.getLast() : null);
  },
  
  getSelectedItems: function(type) {
    if (this.selectedItems) return Array.prototype.slice.call(this.selectedItems, 0);
    return this.selectedItem ? [this.selectedItem] : [];
  },
  
  isItemSelected: function(item) {
    return this.selectedItems ? this.selectedItems.indexOf(item) > -1 : (this.selectedItem == item)
  },
  
  buildItem: function(value) {
    if (this.options.layout.item) return this.buildLayout(this.options.layout.item);
    return new Element('div', {
      'class': 'lsd option', 
      'html': value.toString(), 
      'events': {
        click: function() {
          this.selectItem(value);
        }.bind(this)
      }
    });
  },
  
  getItem: function(item) {
    return (item && item.select) ? item : this.findItemByValue(item);
  },
  
  setItems: function(items) {
    this.list = [];
    this.widgets = [];
    items.each(this.addItem.bind(this));
    return this;
  },
  
  addItem: function(item) {
    if (item.setList) var data = item.getValue ? item.getValue() : item.value || LSD.uid(item), widget = item, item = data;
    if (this.options.list.force && !this.getSelectedItem()) this.selectItem(item);
    if (!this.list.contains(item)) {
      if (widget) {
        widget.listWidget = this;
        this.widgets.push(widget);
      }
      return true;
    }
    return false;
  },
  
  makeItems: function() {
    var item, i = this.widgets.length;
    while (item = this.list[i++]) this.makeItem(item);
  },
	
  makeItem: function(item) {
    var widget = this.buildItem.apply(this, arguments);
    widget.item = widget.value = item;
    if (widget.write) widget.write(item)
    else widget.set('html', item.toString());
    return widget;
  },
  
  getItems: function() {
    return this.list;
  },
  
  hasItems: function() {
    var items = this.getItems()
    return items && items.length > 0;
  },
  
  getItemIndex: function(item) {
    return this.getItems().indexOf(item || this.selectedItem);
  },
  
  findItemByValue: function(value) {
    for (var i = 0, widget; widget = this.widgets[i++];) {
      var val = widget.value == null ? (widget.getValue ? widget.getValue() : null) : widget.value;
      if (val === value) return this.widgets[i];
    }
    return null;
  },
  
  getItemValue: function(item) {
    for (var i = 0, j = this.widgets.length; i < j; i++) {
      if (this.widgets[i] == item) return this.list[i];
    }
    return null;
  },
  
  getActiveItem: function() {
    var active = (this.chosenItem || this.selectedItem);
    return active ? active.value : null;
  },

  next: function(e) {
    this.makeItems();
    var next = this.getItems()[this.getItemIndex(this.getActiveItem()) + 1];
    if (!next && this.options.list.endless) next = this.getItems()[0];
    if (this.selectItem(next, true, !!e)) {
      if (e && e.stop) e.stop();
      return !!this.fireEvent('next', [next]);
    }
    return false;
  },

  previous: function(e) {
    this.makeItems();
    var previous = this.getItems()[this.getItemIndex(this.getActiveItem()) - 1];
    if (!previous && this.options.list.endless) previous = this.getItems().getLast();
    if (this.selectItem(previous, true)) {
      if (e && e.stop) e.stop();
      return !!this.fireEvent('previous', [previous]);
    }
    return false;
  },
  
  sort: function(sort) {
    return this.getItems().sort(sort)
  },
  
  filter: function(filter) {
    return this.getItems().filter(filter)
  }
  
});
/*
---
 
script: Choice.js
 
description: Trait that completes List. Allows one item to be chosen and one selected (think navigating to a menu item to select)
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait.List
 
provides: 
  - LSD.Trait.Choice
 
...
*/


LSD.Trait.Choice = new Class({
  
  selectItem: function(item, temp) {
    if (temp !== true) return this.parent.apply(this, arguments)
    if (!(item = this.getItem(item)) && this.options.list.force) return false;
    var chosen = this.chosenItem;
    this.setSelectedItem(item, 'chosen');
    this.fireEvent('choose', [item, this.getItemIndex()]);
    if (item.choose() && chosen) chosen.forget();
    return item;
  },
  
  forgetChosenItem: function(item) {
    item = this.getItem(item) || this.chosenItem;
    if (item) item.forget();
    this.unsetSelectedItem(item, 'chosen');
  },
  
  selectChosenItem: function() {
    return this.selectItem(this.chosenItem)
  },

  getChosenItems: function() {
    return this.chosenItem || (this.chosenItems ? this.chosenItems.getLast() : null);
  },
  
  getChosenItems: function(type) {
    return this.chosenItems || (this.chosenItem && [this.chosenItem]);
  },
  
  getSelectedOptionPosition: function() {
    var height = 0;
    if (!this.selectedItem) return height;
    for (var i = 0, j = this.widgets.length; i < j; i++) {
      if (this.widgets[i] == this.selectedItem) break;
      height += this.widgets[i].getLayoutHeight();
    }
    return height
  }
});
/*
---
 
script: Element.from.js
 
description: Methods to create elements from strings
 
license: MIT-style license.

credits: 
  - http://jdbartlett.github.com/innershiv
 
requires:
- Core/Element
 
provides: [Element.from, window.innerShiv, Elements.from, document.createFragment]
 
...
*/

document.createFragment = window.innerShiv = (function() {
	var d, r;
	
	return function(h, u) {
	  if (!d) {
			d = document.createElement('div');
			r = document.createDocumentFragment();
			/*@cc_on d.style.display = 'none';@*/
		}
		
		var e = d.cloneNode(true);
		/*@cc_on document.body.appendChild(e);@*/
		e.innerHTML = h.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		/*@cc_on document.body.removeChild(e);@*/
		
		if (u === false) return e.childNodes;
		
		var f = r.cloneNode(true), i = e.childNodes.length;
		while (i--) f.appendChild(e.firstChild);
		
		return f;
	}
}());

Element.from = function(html) {
  new Element(innerShiv(html, false)[0])
};
Elements.from = function(html) {
  new Elements(innerShiv(html))
};
/*
---

name: Request

description: Powerful all purpose Request Class. Uses XMLHTTPRequest.

license: MIT-style license.

requires: [Object, Element, Chain, Events, Options, Browser]

provides: Request

...
*/

(function(){

var empty = function(){},
	progressSupport = ('onprogress' in new Browser.Request);

var Request = this.Request = new Class({

	Implements: [Chain, Events, Options],

	options: {/*
		onRequest: function(){},
		onLoadstart: function(event, xhr){},
		onProgress: function(event, xhr){},
		onComplete: function(){},
		onCancel: function(){},
		onSuccess: function(responseText, responseXML){},
		onFailure: function(xhr){},
		onException: function(headerName, value){},
		onTimeout: function(){},
		user: '',
		password: '',*/
		url: '',
		data: '',
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
		},
		async: true,
		format: false,
		method: 'post',
		link: 'ignore',
		isSuccess: null,
		emulation: true,
		urlEncoded: true,
		encoding: 'utf-8',
		evalScripts: false,
		evalResponse: false,
		timeout: 0,
		noCache: false
	},

	initialize: function(options){
		this.xhr = new Browser.Request();
		this.setOptions(options);
		this.headers = this.options.headers;
	},

	onStateChange: function(){
		var xhr = this.xhr;
		if (xhr.readyState != 4 || !this.running) return;
		this.running = false;
		this.status = 0;
		Function.attempt(function(){
			var status = xhr.status;
			this.status = (status == 1223) ? 204 : status;
		}.bind(this));
		xhr.onreadystatechange = empty;
		if (progressSupport) xhr.onprogress = xhr.onloadstart = empty;
		clearTimeout(this.timer);
		
		this.response = {text: this.xhr.responseText || '', xml: this.xhr.responseXML};
		if (this.options.isSuccess.call(this, this.status))
			this.success(this.response.text, this.response.xml);
		else
			this.failure();
	},

	isSuccess: function(){
		var status = this.status;
		return (status >= 200 && status < 300);
	},

	isRunning: function(){
		return !!this.running;
	},

	processScripts: function(text){
		if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-type'))) return Browser.exec(text);
		return text.stripScripts(this.options.evalScripts);
	},

	success: function(text, xml){
		this.onSuccess(this.processScripts(text), xml);
	},

	onSuccess: function(){
		this.fireEvent('complete', arguments).fireEvent('success', arguments).callChain();
	},

	failure: function(){
		this.onFailure();
	},

	onFailure: function(){
		this.fireEvent('complete').fireEvent('failure', this.xhr);
	},
	
	loadstart: function(event){
		this.fireEvent('loadstart', [event, this.xhr]);
	},
	
	progress: function(event){
		this.fireEvent('progress', [event, this.xhr]);
	},
	
	timeout: function(){
		this.fireEvent('timeout', this.xhr);
	},

	setHeader: function(name, value){
		this.headers[name] = value;
		return this;
	},

	getHeader: function(name){
		return Function.attempt(function(){
			return this.xhr.getResponseHeader(name);
		}.bind(this));
	},

	check: function(){
		if (!this.running) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.pass(arguments, this)); return false;
		}
		return false;
	},
	
	send: function(options){
		if (!this.check(options)) return this;

		this.options.isSuccess = this.options.isSuccess || this.isSuccess;
		this.running = true;

		var type = typeOf(options);
		if (type == 'string' || type == 'element') options = {data: options};

		var old = this.options;
		options = Object.append({data: old.data, url: old.url, method: old.method}, options);
		var data = options.data, url = String(options.url), method = options.method.toLowerCase();

		switch (typeOf(data)){
			case 'element': data = document.id(data).toQueryString(); break;
			case 'object': case 'hash': data = Object.toQueryString(data);
		}

		if (this.options.format){
			var format = 'format=' + this.options.format;
			data = (data) ? format + '&' + data : format;
		}

		if (this.options.emulation && !['get', 'post'].contains(method)){
			var _method = '_method=' + method;
			data = (data) ? _method + '&' + data : _method;
			method = 'post';
		}

		if (this.options.urlEncoded && ['post', 'put'].contains(method)){
			var encoding = (this.options.encoding) ? '; charset=' + this.options.encoding : '';
			this.headers['Content-type'] = 'application/x-www-form-urlencoded' + encoding;
		}

		if (!url) url = document.location.pathname;
		
		var trimPosition = url.lastIndexOf('/');
		if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1) url = url.substr(0, trimPosition);

		if (this.options.noCache)
			url += (url.contains('?') ? '&' : '?') + String.uniqueID();

		if (data && method == 'get'){
			url += (url.contains('?') ? '&' : '?') + data;
			data = null;
		}

		var xhr = this.xhr;
		if (progressSupport){
			xhr.onloadstart = this.loadstart.bind(this);
			xhr.onprogress = this.progress.bind(this);
		}

		xhr.open(method.toUpperCase(), url, this.options.async, this.options.user, this.options.password);
		if (this.options.user && 'withCredentials' in xhr) xhr.withCredentials = true;
		
		xhr.onreadystatechange = this.onStateChange.bind(this);

		Object.each(this.headers, function(value, key){
			try {
				xhr.setRequestHeader(key, value);
			} catch (e){
				this.fireEvent('exception', [key, value]);
			}
		}, this);

		this.fireEvent('request');
		xhr.send(data);
		if (!this.options.async) this.onStateChange();
		if (this.options.timeout) this.timer = this.timeout.delay(this.options.timeout, this);
		return this;
	},

	cancel: function(){
		if (!this.running) return this;
		this.running = false;
		var xhr = this.xhr;
		xhr.abort();
		clearTimeout(this.timer);
		xhr.onreadystatechange = empty;
		if (progressSupport) xhr.onprogress = xhr.onloadstart = empty;
		this.xhr = new Browser.Request();
		this.fireEvent('cancel');
		return this;
	}

});

var methods = {};
['get', 'post', 'put', 'delete', 'GET', 'POST', 'PUT', 'DELETE'].each(function(method){
	methods[method] = function(data){
		var object = {
			method: method
		};
		if (data != null) object.data = data;
		return this.send(object);
	};
});

Request.implement(methods);

Element.Properties.send = {

	set: function(options){
		var send = this.get('send').cancel();
		send.setOptions(options);
		return this;
	},

	get: function(){
		var send = this.retrieve('send');
		if (!send){
			send = new Request({
				data: this, link: 'cancel', method: this.get('method') || 'post', url: this.get('action')
			});
			this.store('send', send);
		}
		return send;
	}

};

Element.implement({

	send: function(url){
		var sender = this.get('send');
		sender.send({data: this, url: url || sender.options.url});
		return this;
	}

});

})();
/*
---

name: Request.Statuses

description: Statuses fire events on request. Also passes arguments to callChain

license: MIT-style license.

references:
  - http://en.wikipedia.org/wiki/List_of_HTTP_status_codes

requires: 
  - Core/Request
  
extends: Core/Request

provides: 
  - Request.Headers

...
*/

/* 
  This is a hack to parse response to failure
  event handlers. Mootools doesnt do this. 
  
  This monkey patch ensures your json is
  parsed (and html applied) even if the status 
  is "non successful" (anything but 2xx).
  
*/
(function(isSuccess, onSuccess) {

var Statuses = Request.Statuses = {
  200: 'Ok',
  201: 'Created',
  202: 'Accepted',
  204: 'NoContent',
  205: 'ResetContent',
  206: 'PartialContent',

  300: 'MultipleChoices',
  301: 'MovedPermantently',
  302: 'Found',
  303: 'SeeOther',
  304: 'NotModified',
  307: 'TemporaryRedirect',

  400: "BadRequest",
  401: "Unathorized",
  402: "PaymentRequired",
  403: "Forbidden",
  404: "NotFound",
  405: "MethodNotAllowed",
  406: "NotAcceptable",
  409: "Conflict",
  410: "Gone",
  411: "LengthRequired",
  412: "PreconditionFailed",
  413: "RequestEntityTooLarge",
  414: "RequestURITooLong",
  415: "UnsupportedMediaType",
  416: "RequestRangeNotSatisfiable",
  417: "ExpectationFailed",

  500: "InternalServerError",
  501: "NotImplemented",
  502: "BadGateway",
  503: "ServiceUnvailable",
  504: "GatewayTimeout",
  505: "VariantAlsoNegotiates",
  507: "InsufficientStorage",
  509: "BandwidthLimitExceeded",
  510: "NotExtended"
};
    
Object.append(Request.prototype, {
  isSuccess: function() {
    return true;
  },
  
  onSuccess: function() {
    var status = Request.Statuses[this.status];
    if (status) this.fireEvent('on' + status, arguments)
    if (isSuccess.call(this)) this.fireEvent('complete', arguments).fireEvent('success', arguments).callChain.apply(this, arguments);
    else this.onFailure.apply(this, arguments);
  },

  onFailure: function(){
    this.fireEvent('complete', arguments).fireEvent('failure', arguments);
  }
});
  
})(Request.prototype.isSuccess, Request.prototype.onSuccess);
/*
---

name: Request.Headers

description: Headers of response fire events on request

license: MIT-style license.

requires: 
  - Core/Request
  
extends: Core/Request

provides: 
  - Request.Headers

...
*/

(function() {
  
var Headers = Request.Headers = {};

Request.defineHeader = function(header, value) {
  Headers[header] = value || true;
};

Request.prototype.addEvent('complete', function() {
  for (var header in Headers) {
    var value = this.getHeader(header);
    if (value) {
      var args = Array.concat(value, arguments);
      this.fireEvent(header.camelCase(), args);
      var callback = Headers[header];
      if (callback && callback.call) callback.apply(this, args)
    }
  }
});

})();
/*
---

name: Request.HTML

description: Extends the basic Request Class with additional methods for interacting with HTML responses.

license: MIT-style license.

requires: [Element, Request]

provides: Request.HTML

...
*/

Request.HTML = new Class({

	Extends: Request,

	options: {
		update: false,
		append: false,
		evalScripts: true,
		filter: false,
		headers: {
			Accept: 'text/html, application/xml, text/xml, */*'
		}
	},

	success: function(text){
		var options = this.options, response = this.response;

		response.html = text.stripScripts(function(script){
			response.javascript = script;
		});

		var match = response.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		if (match) response.html = match[1];
		var temp = new Element('div').set('html', response.html);

		response.tree = temp.childNodes;
		response.elements = temp.getElements(options.filter || '*');

		if (options.filter) response.tree = response.elements;
		if (options.update){
			var update = document.id(options.update).empty();
			if (options.filter) update.adopt(response.elements);
			else update.set('html', response.html);
		} else if (options.append){
			var append = document.id(options.append);
			if (options.filter) response.elements.reverse().inject(append);
			else append.adopt(temp.getChildren());
		}
		if (options.evalScripts) Browser.exec(response.javascript);

		this.onSuccess(response.tree, response.elements, response.html, response.javascript);
	}

});

Element.Properties.load = {

	set: function(options){
		var load = this.get('load').cancel();
		load.setOptions(options);
		return this;
	},

	get: function(){
		var load = this.retrieve('load');
		if (!load){
			load = new Request.HTML({data: this, link: 'cancel', update: this, method: 'get'});
			this.store('load', load);
		}
		return load;
	}

};

Element.implement({

	load: function(){
		this.get('load').send(Array.link(arguments, {data: Type.isObject, url: Type.isString}));
		return this;
	}

});

/*
---

name: Request.JSON

description: Extends the basic Request Class with additional methods for sending and receiving JSON data.

license: MIT-style license.

requires: [Request, JSON]

provides: Request.JSON

...
*/

Request.JSON = new Class({

	Extends: Request,

	options: {
		/*onError: function(text, error){},*/
		secure: true
	},

	initialize: function(options){
		this.parent(options);
		Object.append(this.headers, {
			'Accept': 'application/json',
			'X-Request': 'JSON'
		});
	},

	success: function(text){
		var json;
		try {
			json = this.response.json = JSON.decode(text, this.options.secure);
		} catch (error){
			this.fireEvent('error', [text, error]);
			return;
		}
		if (json == null) this.onFailure();
		else this.onSuccess(json, text);
	}

});

/*
---

name: Request.Auto

description: Accepts both json and html as response

license: MIT-style license.

requires: 
  - Core/Request.JSON
  - Core/Request.HTML

provides: 
  - Request.Auto
...
*/

Request.Auto = new Class({
  
	Extends: Request,
	
	options: {
	  headers: {
			Accept: 'application/json, text/html'
		}
	},
	
	success: function() {
	  var contentType = this.getContentType();
	  if (!contentType) return false;
	  var type = contentType.indexOf('json') > -1 ? 'JSON' : false;
	  return (type ? Request[type] : Request).prototype.success.apply(this, arguments);
	},
	
	getContentType: function() {
	  return this.getHeader('Content-Type') ? this.getHeader('Content-Type').split(';')[0] : null;
	}
});
/*
---
 
script: Resource.js
 
description: Base class that defines remote resource
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

credits:
  Influenced by Jester javascript library

requires:
  - Core/Options
  - Core/Events
  - Core/Chain
  - String.Inflections/String.camelize
  - Ext/Request.Auto

provides:
  - Resource
 
...
*/


Resource = new Class({
  Implements: [Options, Events, Chain],

  options: {
    format: 'json',
    urls: {
      'list': '/:plural',
      'show': '/:plural/:id',
      'destroy': '/:plural/:id',
      'new': '/:plural/new'
    },
    request: {
      secure: false
    },
    associations: {}, //{users: ['Person', options]}
    prefix: '', //If prefix is 'true' it respects parent association's path
    custom: {}, //Name => method hash or an array of PUT methods
    postprocess: function(data) {
      if (typeOf(data) != 'array' || data.some(function(e) { return e.length != 2})) return data
      return {
        errors: data.map(function(i) { return i.join(' ')})
      }
    }
  },
  
  associations: {},

  initialize: function(name, options) {
    
    this.name = name;
    Object.append(this.options, {
      singular: name.tableize().singularize(),
      plural: name.tableize().pluralize(),
      name: name
    });
    
    this.setOptions(options)
    Object.append(this.options, {
      singular_xml: this.options.singular.replace(/_/g, '-'),
      plural_xml: this.options.plural.replace(/_/g, '-')
    })
    
    this.klass = new Class({
      Extends: Resource.Model
    })
    Object.append(this.klass, this)
    this.klass.implement({resource: this})
    this.klass.implement(this.setAssociations(this.options.associations))
    this.klass.implement(this.setCustomActions(this.options.custom))
    return this.klass
  },
  
  setAssociations: function(associations) {
    if (!associations) return
    
    var obj = {}
    Object.each(associations, function(association, name) {      
      var singular = name.singularize().camelCase().capitalize()
      this['get' + singular] = function(data) {
        return new (this.resource.associations[name])(data, true)
      }
      var reflection = association[0]      
      var options = Object.append({prefix: true}, association[1] || {})      
      options.prefix_given = options.prefix
      
      
      if (options.prefix == true) {
        options.prefix = this.locate.bind(this)        
      } else if (options.prefix == false) {
        options.prefix = this.options.prefix
      }
      var assoc = this.associations[name] = new Resource(reflection, options)
      var klsfd = name.camelCase().pluralize().capitalize()
      var singular = klsfd.singularize()
      obj['get' + singular] = function() {
        if (!this[name]) return;
        return this[name]
      }
      obj['get' + klsfd] = function() {
        return assoc.claim(this)
      }
      obj['get' + klsfd + 'Association'] = function() {
        return assoc.claim(this)
      }
      obj['set' + singular] = function(value, existant) {
        return this[name] = new assoc(value, existant, this)
      }
      obj['set' + klsfd] = function(value, existant) {
        return this[name] = value.map(function(el) {
          return new assoc(el, existant, this)
        }.bind(this))
      }
      obj['new' + singular] = function(data) {
        return new assoc(data, false, this)
      }
      obj['init' + singular] = function(data) {
        return new assoc(data, true, this)
      }
    }, this)
    return obj
  },
  
  setCustomActions: function(actions) {
    if (!actions) return;
    var methods = {};
    
    if (typeOf(actions) == 'array') { //We assume that array of custom methods is all of PUTs
      var arr = actions.push ? actions : [actions];
      actions = {};
      for (var i = 0, j = arr.length; i < j; i++) actions[arr[i]] = 'put';
    }
    
    Object.each(actions, function(value, key) {
      methods[key] = Resource.Model.createCustomAction.call(this, key, value);
    }, this);
    
    return methods;
  },

  getRequest: function() {
    return new Request.Auto(this.options.request)
  },
  
  create: function(a, b) { //Ruby-style Model#create backward compat
    return new (this.klass || this)(a, b)
  },
  
  init: function(a) {
    return this.create(a, true)
  },
  
  claim: function(thing) {
    this.options.prefix = thing.prefix || (this.options.prefix && this.options.prefix.call ? this.options.prefix(thing) : this.options.prefix)
    return this
  },
  
  request: function(options, callback, model) {
    if (options.route) options.url = this.getFormattedURL(options.route, options);
    if (options.data && options.data.call) options.data = options.data.call(model)
    
    var req = this.getRequest();
    ['success', 'failure', 'request', 'complete'].each(function(e) {
      var cc = 'on' + e.capitalize()
      req.addEvent(e, function(data) {
        data = this[this[cc] ? cc : "handle"].apply(this, arguments);
        if (e == 'success') {
          if (callback) {
            switch (typeOf(callback)) {
              case "string":
                this.fireEvent(callback, data);
                break;
              case "function":
                if (typeOf(data) == "array") {
                  callback.apply(window, data)
                } else {
                  callback(data);
                }
            }
          }
        }

        if (options[cc]) options[cc](data);
        if (e == 'success') this.callChain(data);
        model.fireEvent(e, data);
      }.bind(this));
      return req;
    }, this)
    req.send(options)
    
    return req;
  },

  onFailure: function(response) {
    return this.getParser('json').parse(JSON.decode(response))
  },
  
  handle: function() {
    var parser = this.getParser();
    var data = this.options.postprocess(parser.parse.apply(parser, arguments));
    switch(typeOf(data)) {
      case "array":
        return data.map(this.init.bind(this));
      case "string":
        return data;
      case "object": case "hash":
        return this.init(data);
    }
  },
  
  find: function(id, params, callback) {
    if (!callback && typeOf(params) != 'object') {
      callback = params;
      params = null;
    }
    switch (id) {
      case 'first': return this.find('all', callback)
      case 'all': return this.request({method: 'get', route: 'list', data: params}, callback);
      default: return this.request({method: 'get', route: 'show', data: params, id: id}, callback);
    }
  },
  
  getParser: function(format) {
    var parser = Resource.Parser[(format || this.options.format).toUpperCase()];
    if (!parser.instance) parser.instance = new parser;
    return parser.instance;
  },
  
  getURL: function(route, thing) {
    var prefix = thing.prefix || (this.options.prefix && this.options.prefix.call ? this.options.prefix(thing) : this.options.prefix);
    var route = (this.options.urls[route] || route);
    if (route.charAt(0) == '/' && prefix.charAt(prefix.length - 1) == '/') prefix = prefix.substring(0, prefix.length - 1);
    return Resource.interpolate(prefix + route, thing, this.options)
  },
  
  locate: function(thing) {
    return this.getURL('show', thing)
  },
   
  getFormattedURL: function(route, thing) {
    return this.format(this.getURL(route, thing))
  },
  
  format: function(string) {
    return string;
  }
});

!function() {
  
  var fill = function (what, thing, opts) {
    switch(what) {
      case 'format':
        return '.' + opts.format
      case 'singular': 
      case 'plural': 
        return opts[what]
      default:
        if (!thing) return (opts) ? opts[what] : null
        if (thing.resource) return thing.get(what.replace(/::/g, '.')) 
        return (typeof(thing[what]) == 'function' ? thing[what]() : thing[what])
    }
  }
  
  var interpolation = function(thing, opts) {
    return function(m, what) {
      return fill(what, thing, opts)
    }
  }
  var regex = /:((?:[a-zA-Z0-9]|::)+)/g;
  Resource.interpolate = function(str, thing, opts) {
    return str.replace(regex, interpolation(thing, opts))
  }
  
}();
/*
---
 
script: Model.js
 
description: A single resource instance
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource
  
provides:
  - Resource.Model
 
...
*/

Resource.Model = new Class({
  Implements: [Options, Events],
  
  initialize: function(attributes, existant_record, claiming) {
    this._claiming = claiming
    this._defaults = attributes
    
    this.set(attributes);
    this._new_record = (existant_record == false) || !this.get('id');
    return this;
  },
  
  set: function(key, value) {
    if (arguments.length == 2) {
      this.setAttribute(key, value)
    } else {
      switch (typeOf(key)) {
        case 'element':
           //try to get attribute resource_id
           //else assume that id is formatted like resource_123.
          var id = Resource.Model.id(key, this.getPrefix());
          break;
        case 'object': case 'array':
          var complex = []
          for (var k in key) {
            if (['array', 'object'].contains(typeOf(key[k]))) {
              complex.push(k)
            } else {  
              this.setAttribute(k, key[k])
            }
          }
          break;
        case 'string': case 'number':
          var id = key;
      }
      
      if (id) {
        this.set('id', id);
        this._new_record = false;
      }
      
      if (this._claiming) {
        this.claim(this._claiming)
        delete this._claiming
      }
      
      if (complex && complex.length) complex.each(function(k) {
        this.setAttribute(k, key[k])
      }, this)
    }
    
    return this
  },
  
  get: function(name) {
    var bits = name.split('.')
    var obj = this
    bits.each(function(bit) {
      if (obj == null || !obj.getAttribute) return obj = null
      obj = obj.getAttribute(bit)
    })
    return obj
  },
  
  setAttribute: function(name, value) {
    if (this['set' + name.camelize()]) value = this['set' + name.camelize()](value)
    this[name] = value
  },  
  
  getAttribute: function(name) {
    if (this['get' + name.camelize()]) return this['get' + name.camelize()]()
    return this[name]
  },
  
  getAssociated: function(name) {
    return this.resource.associations[name]
  },
  
  request: function(options, callback) {
    return this.resource.request(Object.append(this.getClean(), options), callback, this)
  },
  
  getClean: function(){
    //Here we overcome JS's inability to have crossbrowser getters & setters
    //I wouldnt use these pseudoprivate _underscore properties otherwise
    var clean = {};
    for (var key in this){
      if (
        key != 'prototype' && 
        key != 'resource' &&
        key.match(/^[^_$A-Z]/) && //doesnt start with _, $ or capital letter
        typeof(this[key]) != 'function'
      ) clean[key] = this[key];
    }
    return clean;
  },
  
  getAttributes: function() {
    return this.getClean();
  },
  
  isNew: function() {
    return this._new_record
  },
  
  isDirty: function() {
    return this._defaults == this.getClean();
  },
  
  onFailure: function() {
    console.error('Achtung', arguments);
  },
  
  getPrefix: function() {
    return this.resource.options.singular
  },
  
  getData: function() {
    return this.getPrefixedClean()
  },
  
  getPrefixedClean: function() {
    var obj = {}
    var clean = this.getClean()
    delete clean.prefix
    obj[this.getPrefix()] = clean
    
    return obj
  },
  
  getURL: function(route) {
    return this.resource.getURL(route || 'show', this)
  },
  
  claim: function(what) {
    this.prefix = (this.resource.options.prefix_given) && this.resource.options.prefix.run ? this.resource.options.prefix(what) : what.prefix
    return this
  }
});


Resource.Model.id = function(element, prefix) {
  var id;
  if (prefix) id = element.get(prefix + '_id');
  if (!id && (id = element.get('id'))) {
    var regex = '(.*)$';
    if (prefix) {
      regex = '^' + prefix + '[_-]' + regex;
    } else {
      regex = '_' + regex;
    }
    id = (id.match(new RegExp(regex)) || [null, null])[1];
  }
  return id;
};
/*
---
 
script: Resource.Model.Actions.js
 
description: Set of methods to metaprogrammatically generate action set for resource
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Model
  
provides:
  - Resource.Model.Actions
 
...
*/


Resource.Model.Actions = {
  save: function() {
    if (!this._new_record) return Resource.Model.Actions.update.call(this)
    return {method: 'post', route: 'list', data: this.getData, onComplete: this.set.bind(this), onFailure: this.onFailure.bind(this)}
  },
  
  destroy: function() {
    return {method: 'delete', route: 'destroy'}
  },
  
  update: function() {
    return {method: 'put', data: this.getPrefixedClean, route: 'show'}
  },
  
  reload: function() {
    if (!this.id) return this;
    return {method: 'get', route: 'show'}
  },
  
  'new': function() {
    return {method: 'get', route: 'new', data: this.getPrefixedClean}
  }
};


Resource.Model.extend({
  createAction: function(name, options) {
    if (!options) options = {};
    if (!options.action) options.action = Resource.Model.Actions[name];
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      if (args.getLast()) var callback = args.pop();
      Object.append(options, options.action.apply(this, args));
      this.fireEvent('before' + name.capitalize());
      var req = this.request(options, callback);
      return req.chain(function(data) {
        this.fireEvent('after' + name.capitalize(), data);
        return req.callChain(data);
      }.bind(this));
      
      return this;
    }
  },
  
  createCustomAction: function(name, method, obj) {
    if (method.method) {
      obj = method;
      method = obj.method;
    }
    if (!this.options.urls[name]) this.options.urls[name] = '/:plural/:id/' + name
    return Resource.Model.createAction(name, Object.append({
      action: function (data) {
        return {
          onComplete: method == 'put' ? this.set.bind(this) : $lambda,
          data: data
        }
      },
      route: name, 
      method: method
    }, obj));
  }
});

Object.each(Resource.Model.Actions, function(action, name) {
  Resource.Model.prototype[name] = Resource.Model.createAction(name);
});
/*
---
 
script: Resource.Collection.js
 
description: Extended collection of models array (just like Elements in mootools)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - Resource.Model
  
provides:
  - Resource.Collection
 
...
*/

Resource.Collection = function(models) {
  return Object.append(models, this)
};

Resource.Collection.extend({
  createAction: function(name) {
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      if (args.getLast()) var callback = args.pop();
      this.each(function(model) {
        model[a](args)
      });
      if (callback) callback.call(this)
    }
  }
});

Object.each(Resource.Model.Actions, function(action, name) {
  Resource.Collection.prototype[name] = Resource.Collection.createAction(name);
});
/*
---
 
script: Resource.Parser.js
 
description: A base class to convert any object to model properties
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource
  
provides:
  - Resource.Parser
 
...
*/


Resource.Parser = new Class({
  
  integer: function(value) {
    var parsed = parseInt(value);
    return (isNaN(parsed)) ? value : parsed
  },
  
  datetime: function(value) {
    return new Date(Date.parse(value))
  },
  
  'boolean': function(value) {
    return value == 'true'
  },

  array: function(children) {
    return children.map(function(c) { return this.parse(c) }.bind(this))
  }, 
  
  object: function(value) {
    var obj = {}
    Object.each(value, function(val, key) {
      obj[key] = this.parse(val, key)
    }, this)
    return obj
  }
});

Resource.prototype.options.parsers = Resource.Parser;

/*
---
 
script: Resource.Parser.JSON.js
 
description: Applies json as model properties and does type casting
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Parser
  
provides:
  - Resource.Parser.JSON
 
...
*/

Resource.Parser.JSON = new Class({
  Extends: Resource.Parser,
  
  parse: function(value, key) {
    if (!key && !value) return []
    var type = typeOf(value)
    if (type == 'object') return this.object(value)
    if (key) {
      //if (key == 'id' || key.substr(-3, 3) == '_id') return this.integer(value, key)
      if (key.substr(-3, 3) == '_at') return this.datetime(value, key)
    }
    if (type == 'array') return this.array(value, key)
    return value
  }
});
/*
---
 
script: Resource.Parser.HTML.js
 
description: Handles HTML responses from actions
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Parser
  
provides:
  - Resource.Parser.HTML

...
*/


Resource.Parser.HTML = new Class({
  Extends: Resource.Parser,
  
  parse: function(c, c, html) {
    return html;
  }
});
/*
---
 
script: Resource.Parser.XML.js
 
description: Convert xml response based on @type attributes
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Parser
  
provides:
  - Resource.Parser.XML
 
...
*/

Resource.Parser.XML = new Class({
  Extends: Resource.Parser,
  
  parse: function(data) {
    obj = {}
    Object.each(data, function(key, value) {
      obj[key] = this[value['@type']] ? this[value['@type']](value['#text']) : value['#text']
    }, this)
    return obj
  }
});
/*
---

name: Request.Form

description: Create & submit forms.

license: MIT-style license.

requires: 
  - Core/Request
  - More/String.QueryString

provides: 
  - Request.Form

...
*/


(function() {
  var convert = function(thing, prefix) {
    var html = [];
    
    switch (typeOf(thing)) {
      case "object":
        for (var key in thing) html.push(convert(thing[key], prefix ? (prefix + '[' + key + ']') : key));
        break;
      case "array":
        for (var key = 0, length = thing.length; key < length; key++) html.push(convert(thing[key], prefix + '[]'));
        break;
      case "boolean":
        break;
      default:
        if (thing) return ["<input type='hidden' name='", prefix, "' value='", thing.toString().replace(/\"/g, '\\"'), "'/>"].join("");
    }
    return html.join("\n")
  }

  Request.Form = new Class({
  
    Implements: [Options, Events, Chain],
  
    options: {
      url: null,
      method: "get",
      emulation: true,
      async: false,
      form: null,
      data: null
    },
  
    initialize: function(options) {
      if (!options.data) delete options.data;
      this.setOptions(options)
      return this
    },
    
    getData: function(data) {
      return (data && data.toQueryString) ? data.toQueryString().parseQueryString() : data;
    },
    
    getOptions: function(options) {
      options = Object.merge({}, this.options, options)
      var data = this.getData(options.data);
      if (this.options.emulation && !['get', 'post'].contains(options.method)) {
        if (!data) data = {};
        data._method = options.method
        options.method = "post"
      }
      if (data) options.data = data;
      return options;
    },
  
    getForm: function(options, attrs) {
      var form = document.createElement('form');
      form.setAttribute('method', options.method);
      form.setAttribute('action', options.url);
      form.innerHTML = convert(options.data);
      document.body.appendChild(form);
      return form;
    },

    send: function(options) {
      options = this.getOptions(options);
      this.fireEvent('request', options);
      if (!this.unloader) {
        var self = this;
        var onfocus = function() {
          self.fireEvent('complete');
          window.removeListener(Browser.ie ? 'focusout' : 'blur', onfocus)
        }
        onfocus.delay(10000, this)
        window.addListener(Browser.ie ? 'focusout' : 'blur', onfocus)
      }
      if (options.method == 'get') {
        var url = options.url
        if (options.data) {
          url = url.split("?");
          if (url[1]) Object.append(options.data, url[1].parseQueryString());
          url = url[0] + (Object.getLength(options.data) > 0 ? ("?" + Object.toQueryString(options.data)) : "");
        }
        location.href = url;
      } else this.getForm(options).submit();
      return this;
    }
  })
})();
/*
---
 
script: Request.js
 
description: Make various requests to back end
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Core/Request
  - Ext/Request.Form
  - Ext/Request.Auto
  - Ext/document.createFragment
  
provides: 
  - LSD.Mixin.Request
 
...
*/

LSD.Mixin.Request = new Class({
  behaviour: '[action], [src], [href]',
  
  options: {
    request: {
      method: 'get'
    },
    states: {
      working: {
        enabler: 'busy',
        disabler: 'idle'
      }
    },
    actions: {
      request: {
        enable: function() {
          if (this.attributes.autosend) this.send();
        },
        disable: function() {
          
        }
      }
    },
    events: {
      self: {
        getCommandAction: function() {
          if (!this.isRequestURLLocal()) return 'send';
        },

        getTargetAction: function() {
          if (this.getCommandAction() == 'send') return 'update';
        }
      }
    }
  },
  
  send: function() {
    var options = Object.merge({}, this.options.request, {data: this.getRequestData(), url: this.getRequestURL(), method: this.getRequestMethod()});
    for (var i = 0, j = arguments.length, arg, opts; i < j; i++) {
      var arg = arguments[i];
      if (!arg) continue;
      if (typeof arg == 'object' && !arg.event) {
        if (("url" in arg) || ("method" in arg) || ("data" in arg)) Object.merge(options, arg)
        else options.data = Object.merge(options.data || {}, arg);
      } else if (arg.call) var callback = arg;
    }
    var request = this.getRequest(options);
    if (callback) request.addEvent('complete:once', callback);
    return request.send(options);
  },
  
  getRequest: function(options) {
    var type = this.getRequestType();
    if (!this.request || this.request.type != type) {
      if (!this.request) this.addEvent('request', {
        request: 'onRequest',
        complete: 'onRequestComplete',
        success: 'onRequestSuccess',
        failure: 'onRequestFailure'
      });
      this.request = this[type == 'xhr' ? 'getXHRRequest' : 'getFormRequest'](options);
      if (!this.request.type) {
        this.request.type = type;
        this.fireEvent('register', ['request', this.request, type]);
      }
    }
    return this.request;
  },
  
  onRequestSuccess: function() {
    if (this.chainPhase == -1 && this.getCommandAction() == 'send') this.callOptionalChain.apply(this, arguments);
  },
  
  onRequest: function() {
    this.busy();
  },
  
  onRequestComplete: function() {
    this.idle();
  },
  
  getRequestData: Macro.defaults(function() {
    return null;
  }),
  
  getXHRRequest: function(options) {
    return new Request.Auto(options);
  },
  
  getFormRequest: function(options) {
    return new Request.Form(options);
  },
  
  getRequestType: function() {
    return this.attributes.transport || this.options.request.type;
  },
  
  getRequestMethod: function() {
    return this.attributes.method || this.options.request.method;
  },
  
  getRequestURL: function() {
    return this.attributes.href || this.attributes.src || this.attributes.action;
  },
  
  isRequestURLLocal: function(base, host) {
    if (!host) host = location.host;
    if (!base) base = location.pathname;
    var url = this.getRequestURL();
    return (url.charAt(0) == "#") || url.match(new RegExp('(?:' + host + ')?' + base + '/?#'));
  }
});
/*
---
 
script: Form.js
 
description: Act as a form to submit data
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
  - LSD.Mixin.Request
 
provides: 
  - LSD.Trait.Form
 
...
*/

LSD.Trait.Form = new Class({
  
  options: {
    pseudos: Array.fast('submittable')
  },
  
  initialize: function() {
    this.addEvents({
      nodeInserted: function(node) {
        if (!node.form && (node.pseudos['read-write'] || node.pseudos['form-associated'])) node.form = this;
      }
    });
    this.parent.apply(this, arguments);
  },
  
  submit: function(event) {
    this.fireEvent('submit', arguments);
    if (event && event.type == 'submit') {
      event.preventDefault();
      return this.callChain();
    } else return this.send.apply(this, arguments);
  },
  
  getRequestURL: function() {
    return this.attributes.action || location.pathname;
  }
}); 
/*
---

script: URI.js

name: URI

description: Provides methods useful in managing the window location and uris.

license: MIT-style license

authors:
  - Sebastian Markbåge
  - Aaron Newton

requires:
  - Core/Object
  - Core/Class
  - Core/Class.Extras
  - Core/Element
  - /String.QueryString

provides: [URI]

...
*/

(function(){

var toString = function(){
	return this.get('value');
};

var URI = this.URI = new Class({

	Implements: Options,

	options: {
		/*base: false*/
	},

	regex: /^(?:(\w+):)?(?:\/\/(?:(?:([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?)?(\.\.?$|(?:[^?#\/]*\/)*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
	parts: ['scheme', 'user', 'password', 'host', 'port', 'directory', 'file', 'query', 'fragment'],
	schemes: {http: 80, https: 443, ftp: 21, rtsp: 554, mms: 1755, file: 0},

	initialize: function(uri, options){
		this.setOptions(options);
		var base = this.options.base || URI.base;
		if (!uri) uri = base;

		if (uri && uri.parsed) this.parsed = Object.clone(uri.parsed);
		else this.set('value', uri.href || uri.toString(), base ? new URI(base) : false);
	},

	parse: function(value, base){
		var bits = value.match(this.regex);
		if (!bits) return false;
		bits.shift();
		return this.merge(bits.associate(this.parts), base);
	},

	merge: function(bits, base){
		if ((!bits || !bits.scheme) && (!base || !base.scheme)) return false;
		if (base){
			this.parts.every(function(part){
				if (bits[part]) return false;
				bits[part] = base[part] || '';
				return true;
			});
		}
		bits.port = bits.port || this.schemes[bits.scheme.toLowerCase()];
		bits.directory = bits.directory ? this.parseDirectory(bits.directory, base ? base.directory : '') : '/';
		return bits;
	},

	parseDirectory: function(directory, baseDirectory){
		directory = (directory.substr(0, 1) == '/' ? '' : (baseDirectory || '/')) + directory;
		if (!directory.test(URI.regs.directoryDot)) return directory;
		var result = [];
		directory.replace(URI.regs.endSlash, '').split('/').each(function(dir){
			if (dir == '..' && result.length > 0) result.pop();
			else if (dir != '.') result.push(dir);
		});
		return result.join('/') + '/';
	},

	combine: function(bits){
		return bits.value || bits.scheme + '://' +
			(bits.user ? bits.user + (bits.password ? ':' + bits.password : '') + '@' : '') +
			(bits.host || '') + (bits.port && bits.port != this.schemes[bits.scheme] ? ':' + bits.port : '') +
			(bits.directory || '/') + (bits.file || '') +
			(bits.query ? '?' + bits.query : '') +
			(bits.fragment ? '#' + bits.fragment : '');
	},

	set: function(part, value, base){
		if (part == 'value'){
			var scheme = value.match(URI.regs.scheme);
			if (scheme) scheme = scheme[1];
			if (scheme && this.schemes[scheme.toLowerCase()] == null) this.parsed = { scheme: scheme, value: value };
			else this.parsed = this.parse(value, (base || this).parsed) || (scheme ? { scheme: scheme, value: value } : { value: value });
		} else if (part == 'data'){
			this.setData(value);
		} else {
			this.parsed[part] = value;
		}
		return this;
	},

	get: function(part, base){
		switch (part){
			case 'value': return this.combine(this.parsed, base ? base.parsed : false);
			case 'data' : return this.getData();
		}
		return this.parsed[part] || '';
	},

	go: function(){
		document.location.href = this.toString();
	},

	toURI: function(){
		return this;
	},

	getData: function(key, part){
		var qs = this.get(part || 'query');
		if (!(qs || qs === 0)) return key ? null : {};
		var obj = qs.parseQueryString();
		return key ? obj[key] : obj;
	},

	setData: function(values, merge, part){
		if (typeof values == 'string'){
			var data = this.getData();
			data[arguments[0]] = arguments[1];
			values = data;
		} else if (merge){
			values = Object.merge(this.getData(), values);
		}
		return this.set(part || 'query', Object.toQueryString(values));
	},

	clearData: function(part){
		return this.set(part || 'query', '');
	},

	toString: toString,
	valueOf: toString

});

URI.regs = {
	endSlash: /\/$/,
	scheme: /^(\w+):/,
	directoryDot: /\.\/|\.$/
};

URI.base = new URI(Array.from(document.getElements('base[href]', true)).getLast(), {base: document.location});

String.implement({

	toURI: function(options){
		return new URI(this, options);
	}

});

})();

/*
---
 
script: Resource.js
 
description: Make various requests to back end
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Resource/*
  - More/URI
  
provides: 
  - LSD.Mixin.Resource
 
...
*/

LSD.Mixin.Resource = new Class({
  behaviour: ":resourceful, [itemscope]",
  
  options: {
    resource: {
      prefix: null,
      name: null
    }
  },
  
  getResource: function(options) {
    if (!options) options = this.options.resource
    if (!this.resource) {
      var name = options.name;
      var prefix = options.prefix;
      if (!name || !prefix) {
        var uri = this.attributes.itemtype.split(/\s+/).getLast();
        if (uri) {
          if (uri.toURI) uri = uri.toURI();
          prefix = uri.get('directory');
          name = uri.get('file');
          while (!name || !(name = name.singularize())) {
            var dirs = prefix.split('/');
            name = dirs.pop();
            prefix = dirs.join('/')
          }
        }
      }
      var options = Object.clone(this.options.resource);
      if (prefix) options.prefix = prefix;
      this.resource = new Resource(name, options);
    }
    return this.resource;
  },
  
  getResourceID: function() {
    return this.attributes.itemid;
  },
  
  getModel: function() {
    return this.getResource().init(this.getResourceID() || this.element);
  }
});
/*
---

name: Events.Pseudos

description: Adds the functionality to add pseudo events

license: MIT-style license

authors:
  - Arian Stolwijk

requires: [Core/Class.Extras, Core/Slick.Parser, More/MooTools.More]

provides: [Events.Pseudos]

...
*/

Events.Pseudos = function(pseudos, addEvent, removeEvent){

	var storeKey = 'monitorEvents:';

	var storageOf = function(object){
		return {
			store: object.store ? function(key, value){
				object.store(storeKey + key, value);
			} : function(key, value){
				(object.$monitorEvents || (object.$monitorEvents = {}))[key] = value;
			},
			retrieve: object.retrieve ? function(key, dflt){
				return object.retrieve(storeKey + key, dflt);
			} : function(key, dflt){
				if (!object.$monitorEvents) return dflt;
				return object.$monitorEvents[key] || dflt;
			}
		};
	};

	var splitType = function(type){
		if (type.indexOf(':') == -1 || !pseudos) return null;

		var parsed = Slick.parse(type).expressions[0][0],
			parsedPseudos = parsed.pseudos,
			l = parsedPseudos.length,
			splits = [];

		while (l--) if (pseudos[parsedPseudos[l].key]){
			splits.push({
				event: parsed.tag,
				value: parsedPseudos[l].value,
				pseudo: parsedPseudos[l].key,
				original: type
			});
		}

		return splits.length ? splits : null;
	};

	var mergePseudoOptions = function(split){
		return Object.merge.apply(this, split.map(function(item){
			return pseudos[item.pseudo].options || {};
		}));
	};

	return {

		addEvent: function(type, fn, internal){
			var split = splitType(type);
			if (!split) return addEvent.call(this, type, fn, internal);

			var storage = storageOf(this),
				events = storage.retrieve(type, []),
				eventType = split[0].event,
				options = mergePseudoOptions(split),
				stack = fn,
				eventOptions = options[eventType] || {},
				args = Array.slice(arguments, 2),
				self = this,
				monitor;

			if (eventOptions.args) args.append(Array.from(eventOptions.args));
			if (eventOptions.base) eventType = eventOptions.base;
			if (eventOptions.onAdd) eventOptions.onAdd(this);

			split.each(function(item){
				var stackFn = stack;
				stack = function(){
					(eventOptions.listener || pseudos[item.pseudo].listener).call(self, item, stackFn, arguments, monitor, options);
				};
			});
			monitor = stack.bind(this);

			events.include({event: fn, monitor: monitor});
			storage.store(type, events);

			addEvent.apply(this, [type, fn].concat(args));
			return addEvent.apply(this, [eventType, monitor].concat(args));
		},

		removeEvent: function(type, fn){
			var split = splitType(type);
			if (!split) return removeEvent.call(this, type, fn);

			var storage = storageOf(this),
				events = storage.retrieve(type);
			if (!events) return this;

			var eventType = split[0].event,
				options = mergePseudoOptions(split),
				eventOptions = options[eventType] || {},
				args = Array.slice(arguments, 2);

			if (eventOptions.args) args.append(Array.from(eventOptions.args));
			if (eventOptions.base) eventType = eventOptions.base;
			if (eventOptions.onRemove) eventOptions.onRemove(this);

			removeEvent.apply(this, [type, fn].concat(args));
			events.each(function(monitor, i){
				if (!fn || monitor.event == fn) removeEvent.apply(this, [eventType, monitor.monitor].concat(args));
				delete events[i];
			}, this);

			storage.store(type, events);
			return this;
		}

	};

};

(function(){

var pseudos = {

	once: {
		listener: function(split, fn, args, monitor){
			fn.apply(this, args);
			this.removeEvent(split.event, monitor)
				.removeEvent(split.original, fn);
		}
	},

	throttle: {
		listener: function(split, fn, args){
			if (!fn._throttled){
				fn.apply(this, args);
				fn._throttled = setTimeout(function(){
					fn._throttled = false;
				}, split.value || 250);
			}
		}
	},

	pause: {
		listener: function(split, fn, args){
			clearTimeout(fn._pause);
			fn._pause = fn.delay(split.value || 250, this, args);
		}
	}

};

Events.definePseudo = function(key, listener){
	pseudos[key] = Type.isFunction(listener) ? {listener: listener} : listener;
	return this;
};

Events.lookupPseudo = function(key){
	return pseudos[key];
};

var proto = Events.prototype;
Events.implement(Events.Pseudos(pseudos, proto.addEvent, proto.removeEvent));

['Request', 'Fx'].each(function(klass){
	if (this[klass]) this[klass].implement(Events.prototype);
});

})();

/*
---

name: Element.Event.Pseudos

description: Adds the functionality to add pseudo events for Elements

license: MIT-style license

authors:
  - Arian Stolwijk

requires: [Core/Element.Event, Events.Pseudos]

provides: [Element.Event.Pseudos]

...
*/

(function(){

var pseudos = {},
	copyFromEvents = ['once', 'throttle', 'pause'],
	count = copyFromEvents.length;

while (count--) pseudos[copyFromEvents[count]] = Events.lookupPseudo(copyFromEvents[count]);

Event.definePseudo = function(key, listener){
	pseudos[key] = Type.isFunction(listener) ? {listener: listener} : listener;
	return this;
};

var proto = Element.prototype;
[Element, Window, Document].invoke('implement', Events.Pseudos(pseudos, proto.addEvent, proto.removeEvent));

})();

/*
---

script: Element.Delegation.js

name: Element.Delegation

description: Extends the Element native object to include the delegate method for more efficient event management.

credits:
  - "Event checking based on the work of Daniel Steigerwald. License: MIT-style license. Copyright: Copyright (c) 2008 Daniel Steigerwald, daniel.steigerwald.cz"

license: MIT-style license

authors:
  - Aaron Newton
  - Daniel Steigerwald

requires: [/MooTools.More, Element.Event.Pseudos]

provides: [Element.Delegation]

...
*/

(function(){

var eventListenerSupport = !(window.attachEvent && !window.addEventListener),
	nativeEvents = Element.NativeEvents;

nativeEvents.focusin = 2;
nativeEvents.focusout = 2;

var check = function(split, target, event){
	var elementEvent = Element.Events[split.event], condition;
	if (elementEvent) condition = elementEvent.condition;
	return Slick.match(target, split.value) && (!condition || condition.call(target, event));
};

var bubbleUp = function(split, event, fn){
	for (var target = event.target; target && target != this; target = document.id(target.parentNode)){
		if (target && check(split, target, event)) return fn.call(target, event, target);
	}
};

var formObserver = function(eventName){

	var $delegationKey = '$delegation:';

	return {
		base: 'focusin',

		onRemove: function(element){
			element.retrieve($delegationKey + 'forms', []).each(function(el){
				el.retrieve($delegationKey + 'listeners', []).each(function(listener){
					el.removeEvent(eventName, listener);
				});
				el.eliminate($delegationKey + eventName + 'listeners')
					.eliminate($delegationKey + eventName + 'originalFn');
			});
		},

		listener: function(split, fn, args, monitor, options){
			var event = args[0],
				forms = this.retrieve($delegationKey + 'forms', []),
				target = event.target,
				form = (target.get('tag') == 'form') ? target : event.target.getParent('form');
				
			if (!form) return;
				
			var formEvents = form.retrieve($delegationKey + 'originalFn', []),
				formListeners = form.retrieve($delegationKey + 'listeners', []),
				self = this;

			forms.include(form);
			this.store($delegationKey + 'forms', forms);

			if (!formEvents.contains(fn)){
				var formListener = function(event){
					bubbleUp.call(self, split, event, fn);
				};
				form.addEvent(eventName, formListener);

				formEvents.push(fn);
				formListeners.push(formListener);

				form.store($delegationKey + eventName + 'originalFn', formEvents)
					.store($delegationKey + eventName + 'listeners', formListeners);
			}
		}
	};
};

var inputObserver = function(eventName){
	return {
		base: 'focusin',
		listener: function(split, fn, args){
			var events = {blur: function(){
				this.removeEvents(events);
			}}, self = this;
			events[eventName] = function(event){
				bubbleUp.call(self, split, event, fn);
			};
			args[0].target.addEvents(events);
		}
	};
};

var eventOptions = {
	mouseenter: {
		base: 'mouseover'
	},
	mouseleave: {
		base: 'mouseout'
	},
	focus: {
		base: 'focus' + (eventListenerSupport ? '' : 'in'),
		args: [true]
	},
	blur: {
		base: eventListenerSupport ? 'blur' : 'focusout',
		args: [true]
	}
};

if (!eventListenerSupport) Object.append(eventOptions, {
	submit: formObserver('submit'),
	reset: formObserver('reset'),
	change: inputObserver('change'),
	select: inputObserver('select')
});

Event.definePseudo('relay', {
	listener: function(split, fn, args){
		bubbleUp.call(this, split, args[0], fn);
	},
	options: eventOptions
});

})();

/*
---
 
script: Events.js
 
description: A mixin that adds support for declarative events assignment
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Events
  - Core/Element.Event
  - More/Element.Delegation
  - More/Events.Pseudos
  - Ext/Element.Properties.widget

provides:
  - LSD.Module.Events

...
*/

LSD.Module.Events = new Class({
  Implements: [Events],
  
  initializers: {
    events: function() {
      this.events = {};
      return {
        events: {
          register: function(name, object) {
            var events = this.events[name];
            if (events) LSD.Module.Events.setStoredEvents.call(object, events, true);
          },
          unregister: function(name, object) {
            var events = this.events[name];
            if (events) LSD.Module.Events.setStoredEvents.call(object, events, false);
          }
        }
      }
    }
  },
  
  addEvent: function(name, fn) {
    return LSD.Module.Events.setEvent.call(this, name, fn)
  },
  
  removeEvent: function(name, fn) {
    return LSD.Module.Events.setEvent.call(this, name, fn, true)
  },
  
  /*
    The functions takes events object defined in options
    and binds all functions to the widget.
  */

  bindEvents: function(events, bind, args) {
    var result = {};
    for (var name in events) {
      var value = events[name];
      if (!value || value.call) result[name] = value;
      else if (value.indexOf) result[name] = this.bindEvent(value, bind, args);
      else result[name] = this.bindEvents(value);
    }
    return result;
  },
  
  bindEvent: function(name, bind, args) {
    if (name.map) {
      var args = name.slice(1);
      name = name[0];
    }
    if (!this.$bound) this.$bound = {};
    if (!this.$bound[name]) this.$bound[name] = LSD.Module.Events.bind(name, bind || this, args);
    return this.$bound[name];
  },

  dispatchEvent: function(type, args){
    var node = this;
    type = type.replace(/^on([A-Z])/, function(match, letter) {
      return letter.toLowerCase();
    });
    while (node) {
      var events = node.$events;
      if (events && events[type]) events[type].each(function(fn){
        return fn[args.push ? 'apply' : 'call'](node, args);
      }, node);
      node = node.parentNode;
    }
    return this;
  },
  
  captureEvent: function(type, args) {
		var events = this.$events[type];
		if (!events) return;
		for (var i = 0, event; event = events[i++];) {
		  var result = event.apply(this, arguments);
		  if (result) return result;
		}
  }
});

Object.append(LSD.Module.Events, {
  setStoredEvents: function(events, state) {
    for (var evt in events)
      for (var i = 0, fn, group = events[evt]; fn = group[i++];)
        this[state ? 'addEvent' : 'removeEvent'](evt, fn.indexOf ? this.bindEvent(fn) : fn);
  },
  setEvent: function(name, fn, revert) {
    if (fn.indexOf) fn = this.bindEvent(fn);
    var method = revert ? 'removeEvent' : 'addEvent';
    if (fn.call) {
      return Events.prototype[method].call(this, name, fn);
    } else {
      if (name.charAt(0) == '_') {
        for (var event in fn) this[method](event, fn[event]);
        return this;
      }
      var target = LSD.Module.Events.Targets[name];
      var events = this.events[name];
      if (target) {
        if (!target.addEvent && !(target.call && (target = target.call(this)))) {
          if (target.events && !events) Object.each(target.events, function(value, event) {
            this.addEvent(event, function(object) {
              if (target.getter === false) object = this;
              LSD.Module.Events.setStoredEvents.call(object, events, value);
            });
          }, this);
          if (target.condition && target.condition.call(this)) target = this;
          else if (target.getter && this[target.getter]) target = this[target.getter];
        }
      }
      if (!events) events = this.events[name] = {};
      var bound = this.bindEvents(fn);
      if (target && target[method]) for (var event in bound) target[method](event, bound[event]);
      for (event in bound) {
        var group = (events[event] || (events[event] = []));
        if (revert) {
          var i = group.indexOf(bound[event]);
          if (i > -1) group.slice(i, 1);
        } else group.include(bound[event])
      }
      return this;
    }
  },
  
  setEventsByRegister: function(name, state, events) {
    var register = this.$register;
    if (!register) register = this.$register = {};
    if (register[name] == null) register[name] = 0;
    switch (register[name] += (state ? 1 : -1)) {
      case 1:
        if (events) this.addEvents(events)
        else LSD.Module.Events.setStoredEvents.call(this, this.events[name], true);
        return true;
      case 0:
        if (events) this.removeEvents(events)
        else LSD.Module.Events.setStoredEvents.call(this, this.events[name], false);
        return false;
    }
  },
  
  bind: function(method, bind, args) {
    return function() {
      if (bind[method]) bind[method].apply(bind, args || arguments);
    }
  }
});

/*
  Target system re-routes event groups to various objects.  
  
  Combine them for fun and profit.
  
  | Keyword    |  Object that recieves events       |
  |-------------------------------------------------|
  | *self*     | widget itself (no routing)         |
  | *element*  | widget element (when built)        |
  | *parent*   | parent widget                      |
  | *document* | LSD document                       |
  | *window*   | window element                     |
  
  | State      | Condition                          |
  |-------------------------------------------------|
  | *enabled*  | widget is enabled                  |
  | *disabled* | widget is disabled                 |
  | *focused*  | widget is focused                  |
  | *blured*   | widget is blured                   |
  | *target*   | first focusable parent is focused  |
  
  | Extras     | Description                        |
  |-------------------------------------------------|
  | *expected* | Routes events to widgets, selected |
  |            | by selectors (keys of event group).|
  |            | Provided by Expectations module    |
  | _\w        | An event group which name starts   |
  |            | with underscore is auto-applied    |
                 
                 
  
  
  Advanced example:
  
  events: {
    self: {
      focus: 'onFocus'
    },
    window: {
      resize: 'onWindowResize'
    },
    parent: {
      element: { //event delegation
        'click:relay(.button)': 'onButtonClick' 
      }
    },
    expected: { 
      'button:first-child': { //waits for widgets
        parent: {}
      }
    }
  }
*/
LSD.Module.Events.Targets = {
  element: {
    getter: 'element',
    events: {
      'attach': true,
      'detach': false
    }
  },
  parent: {
    getter: 'parentNode',
    events: {
      'setParent': true,
      'unsetParent': false
    }
  },
  document: {
    getter: 'document',
    events: {
      'setDocument': true,
      'unsetDocument  ': false
    }
  },
  self: function() { 
    return this
  },
  window: function() {
    return window;
  },
  mobile: function() {
    return this;
  }
};

!function(Events, Known, Positive, Negative) {
  Object.each(Object.append({}, Positive, Negative), function(name, condition) {
    var events = {}, positive = !!Positive[name], state = Known[name];
    events[state[!positive ? 'enabler' : 'disabler']] = true;
    events[state[ positive ? 'enabler' : 'disabler']] = false;
    LSD.Module.Events.Targets[condition] = {
      getter: false,
      condition: function() {
        return positive ^ this[state.property || name]
      },
      events: events
    }
  });
}(LSD.Module.Events, LSD.States.Known, LSD.States.Positive, LSD.States.Negative)


/*
  Defines special *on* pseudo class for events used for
  event delegation. The difference between usual event 
  delegation (which is :relay in mootools) and this, is
  that with :on you can use LSD selectors and it fires 
  callbacks in context of widgets.
  
  element.addEvent('mouseover:on(button)', callback)
*/

Event.definePseudo('on', function(split, fn, args){
  var event = args[0];
  var widget = Element.get(event.target, 'widget');
  if (widget && widget.match(split.value)) {
    fn.call(widget, event, widget, event.target);
    return;        
  }
});

LSD.Options.events = {
  add: 'addEvent',
  remove: 'removeEvent',
  iterate: true
};
/*
---

script: Accessories.js

description: Things that change the widget in one module

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.Options
  - LSD.Module.States
  - LSD.Module.Attributes
  - LSD.Module.Events
  - LSD.Module.Dimensions
  - LSD.Module.Styles
  - LSD.Module.Shortcuts
  - LSD.Module.Element
  - LSD.Module.Selectors
provides: 
  - LSD.Module.Accessories

...
*/

LSD.Module.Accessories = new Class({
  Implements: [
    LSD.Module.Options,
    LSD.Module.States,
    LSD.Module.Attributes,
    LSD.Module.Events,
    LSD.Module.Dimensions,
    LSD.Module.Styles,
    LSD.Module.Shortcuts,
    LSD.Module.Element,
    LSD.Module.Selectors
  ]
});
/*
---
 
script: Expectations.js
 
description: A trait that allows to wait for related widgets until they are ready
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - LSD.Module.Events
  - LSD.Module.Attributes

provides: 
  - LSD.Module.Expectations
 
...
*/

!function() {
  
var Expectations = LSD.Module.Expectations = new Class({
  
  initializers: {
    expectations: function() {
      this.expectations = {}
      return {
        events: Expectations.events
      }
    }
  },
  
  getElementsByTagName: function(tag) {
    var cache = this.expectations.tag;
    return (cache && cache[tag.toLowerCase()]) || [];
  },
  
  match: function(selector) {
    if (typeof selector == 'string') selector = Slick.parse(selector);
    if (selector.expressions) selector = selector.expressions[0][0];
    if (selector.tag && (selector.tag != '*') && (this.options.tag != selector.tag)) return false;
    if (selector.id && (this.attributes.id != selector.id)) return false;
    if (selector.attributes) for (var i = 0, j; j = selector.attributes[i]; i++) 
      if (j.operator ? !j.test(this.attributes[j.key] && this.attributes[j.key].toString()) : !(j.key in this.attributes)) return false;
    if (selector.classes) for (var i = 0, j; j = selector.classes[i]; i++) if (!this.classes[j.value]) return false;
    if (selector.pseudos) {
      for (var i = 0, j; j = selector.pseudos[i]; i++) {
        var name = j.key;
        if (this.pseudos[name]) continue;
        var pseudo = pseudos[name];
        if (pseudo == null) pseudos[name] = pseudo = Slick.lookupPseudo(name) || false;
        if (pseudo === false || (pseudo && !pseudo.call(this, this, j.value))) return false;
      }
    }
    return true;
  },
  
  /*
    Expect processes a single step in a complex selector.
    
    Each of those bits (e.g. strong.important) consists 
    pieces that can not be cnahged in runtime (tagname)
    and other dynamic parts (classes, pseudos, attributes).
    
    The idea is to split the selector bit to static and dynamic
    parts. The widget that is *expect*ing the selector, groups
    his expectations by tag name. Every node inserted into
    that element or its children will pick up expectations
    related to it, thus matching static part of a selector.
    Then it's time to match the dynamic part. 
  */
  expect: function(selector, callback) {
    var combinator = selector.combinator || 'self';
    var id = selector.id;
    var index = (combinator == ' ' && id) ? 'id' : combinator; 
    var expectations = this.expectations[index];
    if (!expectations) expectations = this.expectations[index] = {};
    if (selector.combinator) {
      /*
        Given selector has combinator.
        Finds related elements and passes expectations to them.
      */
      if (!selector.structure) {
        var separated = separate(selector);
        selector.structure = { Slick: true, expressions: [[separated.structure]] }
        if (separated.state) selector.state = separated.state;
      }
      var key = (index == 'id') ? id : selector.tag;
      var group = expectations[key];
      if (!group) group = expectations[key] = [];
      group.push([selector, callback]);
      var state = selector.state;
      if (this.document && this.document.documentElement) this.getElements(selector.structure).each(function(widget) {
        if (state) widget.expect(state, callback);
        else callback(widget, true);
      });
    } else {
      /*
        Selector without combinator,
        depends on state of current widget.
      */
      for (var types = ['pseudos', 'classes', 'attributes'], type, i = 0; type = types[i++];) {
        var values = selector[type];
        if (values) values: for (var j = 0, value; (value = values[j++]) && (value = value.key || value.value);) {
          var kind = expectations[type];
          if (!kind) kind = expectations[type] = {};
          var group = kind[value];
          if (!group) group = kind[value] = [];
          for (var k = group.length, expectation; expectation = group[--k];) if (expectation[0] == selector) continue values;
          group.push([selector, callback]);
        }
      }
      if (this.match(selector)) callback(this, true);
    }
  },
  
  unexpect: function(selector, callback, iterator) {
    if (selector.expressions) selector = selector.expressions[0][0];
    if (selector.combinator) {
      remove(this.expectations[selector.combinator][selector.tag], callback);
      if (!selector.state) return;
      this.getElements(selector.structure).each(function(widget) {
        widget.unexpect(selector.state, callback);
        if (iterator) iterator(widget)
      });
    } else {
      if (iterator) iterator(widget)
      for (var types = ['pseudos', 'classes', 'attributes'], type, i = 0; type = types[i++];) {
        var values = selector[type], self = this.expectations.self;
        if (values) for (var j = 0, value; (value = values[j++]) && (value = value.key || value.value);) {
          remove(self[type][value], callback);
        }
      }
    }
  },
  
  watch: function(selector, callback, depth) {
    if (typeof selector == 'string') selector = Slick.parse(selector);
    if (!depth) depth = 0;
    selector.expressions.each(function(expressions) {
      var watcher = function(widget, state) {
        if (expressions[depth + 1]) widget[state ? 'watch' : 'unwatch'](selector, callback, depth + 1)
        else callback(widget, state)
      };
      watcher.callback = callback;
      this.expect(expressions[depth], watcher);
    }, this);
  },
  
  unwatch: function(selector, callback, depth) {
    if (typeof selector == 'string') selector = Slick.parse(selector);
    if (!depth) depth = 0;
    selector.expressions.each(function(expressions) {
      this.unexpect(expressions[depth], callback, function(widget) {
        if (expressions[depth + 1]) widget.unwatch(selector, callback, depth + 1)
        else callback(widget, false)
      });
    }, this);
  },
  
  use: function() {
    var selectors = Array.flatten(arguments);
    var widgets = []
    var callback = selectors.pop();
    var unresolved = selectors.length;
    selectors.each(function(selector, i) {
      var watcher = function(widget, state) {
        if (state) {
          if (!widgets[i]) {
            widgets[i] = widget;
            unresolved--;
            if (!unresolved) callback.apply(this, widgets.concat(state))
          }
        } else {
          if (widgets[i]) {
            if (!unresolved) callback.apply(this, widgets.concat(state))
            delete widgets[i];
            unresolved++;
          }
        }
      }
      this.watch(selector, watcher)
    }, this)
  }
});

var pseudos = {};
var check = function(type, value, state, target) {
  var expectations = this.expectations
  if (!target) {
    expectations = expectations.self;
    target = this;
  }
  expectations = expectations && expectations[type] && expectations[type][value];
  if (expectations) for (var i = 0, expectation; expectation = expectations[i++];) {
    var selector = expectation[0];
    if (selector.structure && selector.state) {
      if (target.match(selector.structure)) {
        if (!state) {
          if (target.match(selector.state)) {
            target.unexpect(selector.state, expectation[1]);
            expectation[1](target, !!state)
          }
        } else target.expect(selector.state, expectation[1])
      }
    } else if (target.match(selector)) expectation[1](target, !!state)
  }
}

var notify = function(widget, type, tag, state, target) {
  check.call(widget, type, tag, state, target)
  check.call(widget, type, "*", state, target)
}

var update = function(widget, tag, state) {
  notify(this, ' ', tag, state, widget);
  var options = widget.options, id = widget.id;
  if (id) check.call(this, 'id', id, state, widget);
  if (this.previousSibling) {
    notify(this.previousSibling, '!+', options.tag, state, widget);
    notify(this.previousSibling, '++', options.tag, state, widget);
    for (var sibling = this; sibling = sibling.previousSibling;) {
      notify(sibling, '!~', tag, state, widget);
      notify(sibling, '~~', tag, state, widget);
    }
  }
  if (this.nextSibling) {
    notify(this.nextSibling, '+',  tag, state, widget);
    notify(this.nextSibling, '++', tag, state, widget);
    for (var sibling = this; sibling = sibling.nextSibling;) {
      notify(sibling, '~',  tag, state, widget);
      notify(sibling, '~~', tag, state, widget);
    }
  }
  if (widget.parentNode == this) notify(this, '>', options.tag, state, widget);
}

var remove = function(array, callback) {
  if (array) for (var i = array.length; i--;) {
    var fn = array[i][1]; 
    if (fn == callback || fn.callback == callback) array.splice(i, 1);
  }
}

var separate = function(selector) {
  if (selector.state || selector.structure) return selector
  var separated = {};
  for (var criteria in selector) {
    switch (criteria) {
      case 'tag': case 'combinator': case 'id':
        var type = 'structure';
        break;
      default:
        var type = 'state';
    }
    var group = separated[type];
    if (!group) group = separated[type] = {};
    group[criteria] = selector[criteria]
  };
  return separated;
}



Expectations.events = {
  nodeInserted: function(widget) {
    var expectations = this.expectations, type = expectations.tag, tag = widget.tagName;
    if (!type) type = expectations.tag = {};
    var group = type[tag];
    if (!group) group = type[tag] = [];
    group.push(widget);
    group = type['*'];
    if (!group) group = type['*'] = [];
    group.push(widget);
    update.call(this, widget, tag, true);
  },
  nodeRemoved: function(widget) {
    var expectations = this.expectations, type = expectations.tag, tag = widget.tagName;
    type[tag].erase(widget);
    type["*"].erase(widget);
    update.call(this, widget, tag, false);
  },
  setParent: function(parent) {
    notify(this, '!>', parent.tagName, true, parent);
    for (; parent; parent = parent.parentNode) notify(this, '!', parent.tagName, true, parent);
  },
  unsetParent: function(parent) {
    notify(this, '!>', parent.tagName, false, parent);
    for (; parent; parent = parent.parentNode) notify(this, '!', parent.tagName, false, parent);
  },
  selectorChange: check 
};

LSD.Module.Events.Targets.expected = function() {
  var self = this, Targets = LSD.Module.Events.Targets;
  return {
    addEvent: function(key, value) {
      if (!self.watchers) self.watchers = {};
      self.watchers[key] = function(widget, state) {
        value = Object.append({}, value)
        for (var name in value) {
          if (typeof value[name] == 'object') continue;
          widget.addEvent(name, value[name]);
          delete value[name];
        }
        for (var name in value) {
          target = (Targets[name] || Targets.expected).call(widget);
          target[state ? 'addEvents' : 'removeEvents'](value);
          break;
        }
      };
      self.watch(key, self.watchers[key]);
    },
    removeEvent: function(key, event) {
      self.unwatch(key, self.watchers[key]);
    }
  }
};


//LSD.Options.expectations = {
//  add: 'expect',
//  remove: 'unexpect',
//  iterate: true,
//  process: 'bindEvents'
//};

var States = LSD.States.Known;
  
}();
/*
---

script: Ambient.js

description: When it needs to know what's going on around 

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM
  - LSD.Module.Layout
  - LSD.Module.Expectations
  - LSD.Module.Relations
  - LSD.Module.Proxies
  - LSD.Module.Container

provides: 
  - LSD.Module.Ambient

...
*/

LSD.Module.Ambient = new Class({
  Implements: [
    LSD.Module.DOM, 
    LSD.Module.Layout,
    LSD.Module.Expectations,
    LSD.Module.Relations,
    LSD.Module.Proxies,
    LSD.Module.Container
  ]
});
/*
---
 
script: Command.js
 
description: A command getter that watches attributes to redefine command
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD.Module.Expectations
  - LSD.Command.Command
  - LSD.Command.Radio
  - LSD.Command.Checkbox
  
provides: 
  - LSD.Module.Command
 
...
*/

/*
  Usually a widget that does something interactive defines command
  automatically. 
  
  The default type is 'command', but there are possible values of 
  'radio' and 'checkbox'.
  
  Type type can be changed via *options.command.type* 
  (equals to 'command-type' attribute).
  
  You can specify a command id in *command* attribute
  to link a widget to already initialized command.
*/

LSD.Module.Command = new Class({
  options: {
    command: {},
    chain: {
      commandaction: function() {
        var action = this.getCommandAction.apply(this, arguments);
        if (action) return {action: action, priority: 10}
      }
    },
  },
  
  initializers: {
    command: function() {
      return {
        expectations: {
          '[radiogroup]': ['getCommand', true],
          '[command]': ['getCommand', true],
        }
      }
    }
  },

  getCommand: function(force) {
    if (!force && this.command) return this.command;
    if (!this.attributes.command || !this.document.commands) {
      var options = this.options.command || {};
      var type = options.type || 'command', command;
      options = Object.append({id: this.options.id, name: this.attributes.name}, options);
      if (this.attributes.radiogroup) {
        options.radiogroup = this.attributes.radiogroup;
        type = 'radio'
      };
      if (!command) command = new LSD.Command[type.capitalize()](this.document, options);
    } else command = this.document.commands[this.attributes.command];
    command.attach(this);
    if (force && this.command) this.command.detach(this);
    return this.command = command;
  },
  
  click: function() {
    this.fireEvent('click', arguments);
    this.clearChain.apply(this, arguments);
    var command = this.getCommand();
    command.click.apply(command, arguments);
    return this.callChain.apply(this, arguments);
  },
  
  getCommandAction: function() {
    return this.attributes.commandaction || this.captureEvent('getCommandAction', arguments);
  }
  
});
/*
---

script: Behavior.js

description: Modules that do interactions 

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.Actions
  - LSD.Module.Chain
  - LSD.Module.Command
  - LSD.Module.Target

provides: 
  - LSD.Module.Behavior

...
*/

LSD.Module.Behavior = new Class({
  Implements: [
    LSD.Module.Actions, 
    LSD.Module.Chain, 
    LSD.Module.Command, 
    LSD.Module.Target
  ]
});
/*
---
 
script: Widget.js
 
description: Base widget with all modules included
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Type
  - LSD.Module.Accessories
  - LSD.Module.Ambient
  - LSD.Module.Behavior
  - LSD.Module.Graphics
  - LSD.Mixin.Value

provides: 
  - LSD.Widget
  - LSD.Widget.create
 
...
*/

/*
  Pre-generate CSS grammar for layers.
  
  It is not required for rendering process itself, because
  this action is taken automatically when the first
  widget gets rendered. Declaring layer css styles upfront
  lets us use it in other parts of the framework
  (e.g. in stylesheets to validate styles)
*/

LSD.Widget = new Class({
  
  Implements: [
    LSD.Module.Accessories,
    LSD.Module.Ambient,
    LSD.Module.Behavior,
    LSD.Module.Graphics
  ],
  
  options: {
    key: 'widget',
    writable: false,
    layers: true,
    inline: false
  },
  
  initializers: {
    widget: function(){
      return {
        events: {
          build: function() {
            if ((this.options.writable && !this.attributes.tabindex && (this.options.focusable !== false)) || this.options.focusable) 
              this.setAttribute('tabindex', 0);
            this.addPseudo(this.options.writable ? 'read-write' : 'read-only');
          }
        }
      }
    }
  },
  
  initialize: LSD.Module.Options.initialize
});

LSD.Widget.prototype.addStates('disabled', 'hidden', 'built', 'attached');

new LSD.Type('Widget');
/*
---
 
script: Menu.js
 
description: Menu widget base class
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Widget

provides: 
  - LSD.Widget.Menu
 
...
*/

LSD.Widget.Menu = new Class({
  Extends: LSD.Widget,
  
  options: {
    tag: 'menu',
    element: {
      tag: 'menu'
    }
  }
});

LSD.Widget.Menu.Command = new Class({
  Extends: LSD.Widget,
  
  options: {
    tag: 'command',
    element: {
      tag: 'command'
    },
    pseudos: Array.fast('item')
  }
});

!function(Command) {
  Command.Command = Command.Checkbox = Command.Radio = Command;
}(LSD.Widget.Menu.Command);
/*
---
 
script: Context.js
 
description: Menu widget to be used as a drop down
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Widget.Menu

provides:
  - LSD.Widget.Menu.Context
  - LSD.Widget.Menu.Context.Button
  - LSD.Widget.Menu.Context.Command
  - LSD.Widget.Menu.Context.Command.Command
  - LSD.Widget.Menu.Context.Command.Checkbox
  - LSD.Widget.Menu.Context.Command.Radio
 
...
*/
LSD.Widget.Menu.Context = new Class({
  Extends: LSD.Widget.Menu,

  options: { 
    attributes: {
      type: 'context',
      tabindex: 0
    }
  }
});

LSD.Widget.Menu.Context.Command = new Class({
  Extends: LSD.Widget.Menu.Command
});

!function(Context) {
  Context.Button = Context.Option = Context.Radio = Context.Checkbox = Context.Command.Command = Context.Command;
}(LSD.Widget.Menu.Context);

    


/*
---
 
script: Menu.js
 
description: Dropdowns should be easy to use.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Trait
  - Widgets/LSD.Widget.Menu.Context

provides:
  - LSD.Trait.Menu
 
...
*/

LSD.Trait.Menu = new Class({      
  options: {
    shortcuts: {
      ok: 'set',
      cancel: 'cancel'
    },
    events: {
      _menu: {
        self: {
          expand: 'makeItems',
          redraw: 'repositionMenu',
          focus: 'repositionMenu',
          blur: 'collapse',
          next: 'expand',
          previous: 'expand',
          cancel: 'collapse'
        }
      }
    },
    menu: {
      position: 'top',
      width: 'auto',
      origin: null
    },
    has: {
      one: {
        menu: {
          selector: 'menu[type=context]',
          proxy: function(widget) {
            return widget.pseudos.item;
          }
        }
      }
    },
    states: Array.fast('expanded')
  },

  cancel: function() {
    this.collapse();
  },

  set: function() {
    this.collapse();
  },
  
  repositionMenu: function() {
    if (!this.menu || this.collapsed) return;
    var top = 0;
    var origin = (this.options.menu.origin == 'document') ? this.document : this;
    if (!origin.size) origin.setSize(true);
    if (!this.menu.size) this.menu.setSize(true);
    var position = LSD.position(origin.size, this.menu.size)
    if (position.x != null) {
      position.x += (this.offset.padding.left || 0) - (this.offset.inside.left || 0) + (this.offset.outside.left || 0);
      this.menu.setStyle('left', position.x);
    }
    if (position.y != null) {
      position.y += (this.offset.padding.top || 0) - (this.offset.inside.top || 0) + (this.offset.outside.top || 0);
      this.menu.setStyle('top', position.y);
    }
    switch (this.options.menu.width) {
      case "adapt": 
        this.menu.setWidth(this.getStyle('width'));
        break;
      case "auto":
        break;
    }
  },
  
  buildMenu: function() {
    return this.buildLayout(this.options.layout.menu);
  },
  
  expand: function() {
    if (!this.menu) {
      this.menu = this.buildMenu();
      this.repositionMenu();
      if (this.hasItems()) this.refresh();
    } else {  
      this.repositionMenu();
    }
    this.menu.show();
  },
  
  collapse: function() {
    if(this.menu) this.menu.hide();
  },
  
  getSelectedOptionPosition: function() {
    return 0
  }
});
/*
---
 
script: Button.js
 
description: A button widget. You click it, it fires the event
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Widget
  - LSD/LSD.Mixin.Touchable

provides: 
  - LSD.Widget.Button
 
...
*/

LSD.Widget.Button = new Class({

  Extends: LSD.Widget,

  options: {
    tag: 'button',
    element: {
      tag: 'span'
    },
    label: '',
    pseudos: Array.fast('touchable')
  },
  
  write: function(content) {
    this.setState('text');
    return this.parent.apply(this, arguments);
  }

});

/*
---
 
script: Native.js
 
description: Wrapper for native browser controls
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Widget

provides: 
  - LSD.Native
 
...
*/

LSD.Native = new Class({
  Extends: LSD.Widget,
  options: {
    inline: null //use widget tag when no element tag specified
  }
});
new LSD.Type('Native');

// Inject native widgets into default widget pool as a fallback
LSD.Element.pool[LSD.useNative ? 'unshift' : 'push'](LSD.Native);
/*
---
 
script: Input.js
 
description: A base class for all kinds of form controls
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
 - LSD/LSD.Native

provides: 
  - LSD.Native.Input
 
...
*/

LSD.Native.Input = new Class({
  Extends: LSD.Native,
  
  options: {
    tag: 'input',
    events: {
      _input: {
        element: {
          change: 'setValue'
        }
      }
    },
    focusable: false,
    writable: true
  },
  
  applyValue: function(value) {
    this.element.set('value', value);
  },
  
  getRawValue: function() {
    return this.element.get('value');
  },
  
  focus: function() {
    this.element.focus();
  }
  
});
/*
---
 
script: File.js
 
description: Simple text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.File
 
...
*/

LSD.Native.Input.File = new Class({
  Extends: LSD.Native.Input
});
/*
---
 
script: Text.js
 
description: Simple text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.Text
 
...
*/

LSD.Native.Input.Text = new Class({
  Extends: LSD.Native.Input
});
/*
---
 
script: Hidden.js
 
description: Simple text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.Hidden
 
...
*/

LSD.Native.Input.Hidden = new Class({
  Extends: LSD.Native.Input
});
/*
---
 
script: Password.js
 
description: Simple text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.Password
 
...
*/

LSD.Native.Input.Password = new Class({
  Extends: LSD.Native.Input,
  
  options: {
    events: {
      _password: {
        self: {
          placehold: function(){
            this.element.set('type', 'text');
          },
          unplacehold: function(){
            this.element.set('type', 'password');
          }
        } 
      }
    }
  }
  
});
/*
---
 
script: Checkbox.js
 
description: Simple text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.Checkbox
 
...
*/

LSD.Native.Input.Checkbox = new Class({
  Extends: LSD.Native.Input,
  
  options: {
    command: {
      type: 'checkbox'
    },
    events: {
      _checkbox: {
        element: {
          click: function() { //do it for ie so onchange is fired
            this.blur();
            this.focus()
          }
        },
        self: {
          'attach': function() {
            if (this.element.checked) this.click();
            this.element.addListener('click', this.click.bind(this));
          },
          'check': function() {
            this.element.checked = true;
            this.getCommand().check();
          },
          'uncheck': function() {
            this.element.checked = false;
            this.getCommand().uncheck();
          }
        }
      }
    }
  }
});

LSD.Native.Input.Checkbox.prototype.addState('checked');
/*
---
 
script: Radio.js
 
description: Simple text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.Radio
 
...
*/

LSD.Native.Input.Radio = new Class({
  Extends: LSD.Native.Input,

  options: {
    command: {
      type: 'radio'
    },
    events: {
      _checkbox: {
        self: {
          'click': 'check',
          'attach': function() {
            this.element.addListener('click', this.click.bind(this));
          },
          'dominject': function(){
            if (this.attributes.checked) this.click();
          },
          'check': function() {
            this.element.checked = true;
          },
          'uncheck': function() {
            this.element.checked = false;
          }
        }
      }
    }
  }
});

LSD.Native.Input.Radio.prototype.addState('checked');
/*
---
 
script: Search.js
 
description: Search input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Input.Search
 
...
*/

LSD.Native.Input.Search = new Class({
  Extends: LSD.Native.Input
});
/*
---
 
script: Date.js
 
description: Date picker input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input
  - LSD/LSD.Trait.Date

provides: 
  - LSD.Native.Input.Date

...
*/

LSD.Native.Input.Date = new Class({
  Includes: [
    LSD.Native.Input,
    LSD.Trait.Date
  ],
  
  options: {
    attributes: {
      type: 'date'
    }
  }
});
/*
---
 
script: Textarea.js
 
description: Multiline text input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input

provides: 
  - LSD.Native.Textarea
 
...
*/

LSD.Native.Textarea = new Class({
  Extends: LSD.Native.Input,
  
  options: {
    tag: 'textarea'
  }
});
/*
---
 
script: Button.js
 
description: A button widget. You click it, it fires the event
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Native
  - LSD/LSD.Mixin.Touchable

provides: 
  - LSD.Native.Button
 
...
*/
LSD.Native.Button = new Class({

  Extends: LSD.Native,

  options: {
    tag: 'button',
    element: {
      tag: 'a'
    },
    events: {
      _button: {
        element: {
          click: 'click'
        }
      }
    },
    pseudos: Array.fast('touchable')
  },
  
  click: function(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!this.disabled) return this.parent.apply(this, arguments);
  }
});

/*
---
 
script: Submit.js
 
description: A button that submits form
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Input
  - LSD.Native.Button

provides: 
  - LSD.Native.Input.Submit
 
...
*/

LSD.Native.Input.Submit = new Class({

  Extends: LSD.Native.Button,
  
  options: {
    events: {
      _submission: {
        click: 'submit',
        dominject: function() {
          var tag = this.element.get('tag');
          if (!tag || tag == 'input' || tag == 'button') return;
          this.shim = new Element('input[type=submit]', {
            styles: {
              width: 1,
              height: 0,
              display: 'block',
              border: 0,
              padding: 0,
              overflow: 'hidden',
              position: 'absolute'
            },
            events: {
              click: function(e) {
                e.preventDefault()
              }.bind(this)
            }
          }).inject(this.element);
          this.element.addEvent('destroy', this.shim.destroy.bind(this.shim));
        }
      }
    },
    chain: {
      submission: function() {
        var target = this.form || Slick.find(this, '! :submittable') || (this.document && this.document.submit && this.document);
        if (target) return {action: 'send', target: target};
      }
    },
    pseudos: Array.fast('form-associated')
  }
});

/*
---
 
script: Table.js
 
description: All-purpose table class
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Native
  - LSD/LSD.Trait.List

provides: 
  - LSD.Native.Table
 
...
*/

LSD.Native.Table = new Class({
  Includes: [
    LSD.Native,
    LSD.Trait.List
  ],
  
  options: {
    header: null,
    footer: null,
    caption: null,
    events: {
      _table: {
        self: {
          build: function() {
            var el = this.element;
            this.head = el.tHead;
            this.body = (el.tBodies ? el.tBodies[0] : el.tBody);
            this.foot = el.tFoot;
            this.setTable(this.options);
          }
        }
      }
    },
    tag: 'table'
  },
  
  setTable: function(table) {
    if (table != this.options) this.setOptions(table);
    if (table.caption) this.setCaption(table.caption);
    if (table.header) this.setHeader(table.header);
    if (table.data) this.setData(table.data);
    if (table.footer) this.setFooter(table.footer);
  },
  
  setData: function(data) {
    if (!this.body) this.body = new Element('tbody').inject(this.element);
    else this.body.empty()
    for (var i = 0, row; row = data[i++];) this.body.appendChild(this.setRow(row));
  },
  
  setRow: function(values) {
    var element = document.createElement('tr');
    for (var i = 0, value; value = values[i++];) element.appendChild(this.setCell(value));
    return element;
  },
  
  setCell: function(value) {
    if (value.nodeType) return value;
    var element = document.createElement('td');
    element.appendText(value);
    return element;
  },
  
  setHeaderCell: function(value) {
    if (value.nodeType) return value;
    var element = document.createElement('th');
    element.appendText(value);
    return element;
  },
  
  setCaption: function(text) {
    if (!this.caption) this.caption = new Element('caption').inject(this.element);
    this.caption.innerHTML = text;
    return this.caption;
  },
  
  setHeader: function(header) {
    if (!this.head) this.head = new Element('thead').inject(this.element);
    else this.head.empty()
    header.each(function(name) {
      this.head.appendChild(this.setHeaderCell(name))
    }, this);
    return this.head;
  },
  
  setFooter: function(footer) {
    if (!this.foot) this.foot = new Element('tfoot').inject(this.element);
    else this.foot.empty()
    footer.each(function(name) {
      this.foot.appendChild(this.setHeaderCell(name))
    }, this);
    return this.foot;
  }
});
/*
---
 
script: Calendar.js
 
description: A nice simple calendar table
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Native.Table

provides: 
  - LSD.Native.Table.Calendar
 
...
*/

LSD.Native.Table.Calendar = new Class({
  Extends: LSD.Native.Table,
  
  options: {
    date: null,
    format: {
      caption: "%B %Y"
    },
    classes: ['calendar'],
    events: {
      _calendar: {
        self: {
          'attach': function() {
            this.setDate(this.options.date);
          }
        },
        element: {
          'touchstart:relay(td:not(.empty))': 'touchDate',
          'touchend': 'untouchDate',
          'touchcancel': 'untouchDate',
          'click:relay(td:not(.empty))': 'selectDate'
        }
      }
    }
  },
  
  setRow: function(days) {
    var row = this.parent.apply(this, arguments);
    var number = days[0]
    if ((number <= this.day) && (number + 7 > this.day)) {
      row.className = 'selected';
    } else if (number > this.day) {
      row.className = 'future';
    } else {
      row.className = 'past';
    }
    return row;
  },
  
  selectDate: function(e) {
    var cell = e.target;
    this.day = this.getDayFromCell(cell);
    this.setCell(this.selected);
    this.setDate(this.current.clone().set('date', this.day));
    this.fireEvent('set', this.date);
    this.selected = cell;
    this.setCell(this.selected);
  },
  
  touchDate: function(e) {
    e.target.className += " touched"
    this.touched = e.target;
  },
  
  untouchDate: function(e) {
    if (!this.touched) return;
    this.touched.className = this.touched.className.replace(/\s*touched\s*/, ' ');
    delete this.touched;
  },
  
  getDayFromCell: function(cell) {
    return parseInt(cell.innerHTML);
  },
  
  setCell: function(number) {
    var cell = this.parent.apply(this, arguments);
    if (cell == number) number = this.getDayFromCell(cell);
    if (number == ' ') {
      cell.className = 'empty';
    } else if (number == this.day) {
      cell.className = 'selected';
      this.selected = cell;
    } else if (number > this.day) {
      cell.className = 'future';
    } else {
      cell.className = 'past';
    }
    return cell;
  },
  
  setDate: function(date) {
    this.date = date = (date ? date.clone() : new Date);
    var beginning = date.clone().set('date', 1);
    if (this.currrent && !beginning.compare(this.currrent)) return; false;
    this.current = beginning;
    this.day = this.date.getDate();
    var table = {
      caption: date.format(this.options.format.caption),
      data: [[]],
      header: Locale.get('Date.days_abbr')
    };
    var data = table.data;
    if (this.options.footer !== false) table.footer = table.header;
    var day = beginning.get('day');
    var last = date.getLastDayOfMonth();
    for (var i = 0; i < day; i++) data[0].push(' ');
    for (var i = 1; i <= last; i++) {
      var index = Math.floor((i + day - 1) / 7);
      var row = data[index];
      if (!row) row = data[index] = [];
      row.push(i);
    }
    if (row.length < 7) for (var i = 0, j = data.length - 1, k = (7 - ((last + day) % 7)); i < k; i++) data[j].push(' ');
    if (this.built) this.setTable(table);
    else Object.extend(this.options, table);
  }
});
/*
---
 
script: Anchor.js
 
description: A link that does requests and actions
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Native
  - LSD/LSD.Module.Accessories
  - LSD/LSD.Module.Layout
  - LSD/LSD.Mixin.Dialog
  - LSD/LSD.Mixin.Request

provides: 
  - LSD.Native.Anchor
 
...
*/

LSD.Native.Anchor = new Class({
  Includes: [
    LSD.Module.Accessories,
    LSD.Module.Behavior,
    LSD.Module.Layout,
    LSD.Mixin.Request,
    LSD.Mixin.Dialog
  ],
  
  options: {
    request: {
      type: 'form'
    },
    layout: {
      render: false,
      extract: true
    }
  },

  click: function(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!this.disabled) return this.parent.apply(this, arguments);
  },

  initialize: LSD.Module.Options.initialize

});

LSD.Native.Anchor.prototype.addStates('disabled', 'built', 'attached');
/*
---
 
script: Label.js
 
description: A label for a form field
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Native

provides: 
  - LSD.Native.Label
 
...
*/

LSD.Native.Label = new Class({
  Extends: LSD.Native,
  
  options: {
    tag: 'label',
    has: {
      one: {
        control: {
          expectation: function() {
            var id = this.attributes['for'];
            if (id) return {id: id, combinator: ' ', tag: '*'};
          },
          target: 'document',
          collection: 'labels',
          states: {
            get: {
              invalid: 'invalid'
            }
          }
        }
      }
    },
    pseudos: Array.fast('form-associated'),
    states: Array.fast('invalid'),
    events: {
      _label: {
        element: {
          'click': 'click'
        }
      }
    }
  },
  
  click: function(event){
    if (event && event.preventDefault) event.preventDefault();
    if (!this.disabled) {
      this.focusControl();
      if(this.control && this.control.click) this.control.click();
      return this.parent.apply(this, arguments);
    }
  },
  
  focusControl: function() {
    if (this.control && this.control.focus) {
      this.control.focus();
    }
  }
});
/*
---
 
script: Form.js
 
description: A form widgets. Intended to be submitted.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Native
  - LSD/LSD.Trait.Form
  - LSD/LSD.Trait.Fieldset

provides: 
  - LSD.Native.Form
 
...
*/

LSD.Native.Form = new Class({
  Includes: [
    LSD.Native,
    LSD.Trait.Fieldset,
    LSD.Trait.Form
  ],
  
  options: {
    tag: 'form',
    events: {
      element: {
        submit: 'submit'
      },
      self: {
        build: function() {
          // novalidate html attribute disables internal form validation 
          // on form submission. Chrome and Safari will block form 
          // submission without any visual clues otherwise.
          if (this.element.get('tag') == 'form') this.element.setProperty('novalidate', true);
        }
      }
    }
  }
});
/*
---

script: Document.js

description: Provides a virtual root to all the widgets. DOM-Compatible for Slick traversals.

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Widget

provides:
  - LSD.Document

...
*/


/*
  Document is a big disguise proxy class that contains the tree
  of widgets and a link to document element.
  
  It is DOM-compatible (to some degree), so tools that crawl DOM
  tree (we use Slick) can work with the widget tree like it usually
  does with the real DOM so we get selector engine for free.
  
  The class contains a few hacks that allows Slick to initialize.
*/

LSD.Document = new Class({

  Extends: LSD.Widget,
  
  options: {
    tag: 'body',
    root: false, // topmost widget's parentNode is the document if set to true
    layout: {
      method: 'augment'
    },
    container: {
      enabled: false,
      inline: false
    },
    nodeType: 9
  },
  
  initialize: function(element, options) {
    if (!LSD.document.body) LSD.document = Object.append(this, LSD.document);
    this.body = this;
    this.document = this.documentElement = this;
    this.xml = true;
    this.navigator = {};
    this.slickFeatures = LSD.Module.Selectors.Features;
    if (this.nodeType != 9) this.ownerDocument = this;
    this.parent.apply(this, arguments);
    this.dominjected = true;
  },
  
  addStylesheet: function(sheet) {
    if (!this.stylesheets) this.stylesheets = [];
    this.stylesheets.include(sheet);
    sheet.attach(this);
  },
  
  removeStylesheet: function(sheet) {
    if (!this.stylesheets) return;
    this.stylesheets.erase(sheet);
    sheet.detach(this);
  },
  
  createFragment: function(content) {
    var fragment = document.createFragment(content)
    this.fireEvent('DOMNodeInserted', fragment);
    return fragment;
  }
});

LSD.Document.prototype.addEvents({
  build: function() {
    if (this.watch) {
      // Attach action expectations
      LSD.Module.Actions.attach(this);
    }
    // Attach stylesheets, if there are stylesheets loaded
    if (LSD.Sheet && LSD.Sheet.stylesheets) for (var i = 0, sheet; sheet = LSD.Sheet.stylesheets[i++];) this.addStylesheet(sheet);
  }
});

// Properties set here will be picked up by first document
LSD.document = {}; 
/*
---
 
script: Commands.js
 
description: Document catches the clicks and creates pseudo-widgets on demand
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD.Document
  - Native/LSD.Native.Anchor
 
provides:
  - LSD.Document.Commands
 
...
*/

LSD.Document.Commands = new Class({
  options: {
    events: {
      element: {
        'click': 'onClick'
      }
    }
  },
  
  /* 
    Single relay click listener is put upon document.
    It spies for all clicks on elements and finds out if 
    any links were clicked. If the link is not widget,
    the listener creates a lightweight link class instance and
    calls click on it to trigger commands and interactions.
    
    This way there's no need to preinitialize all link handlers, 
    and only instantiate class when the link was actually clicked.
  */
  onClick: function(event) {
    var link = (LSD.toLowerCase(event.target.tagName) == 'a') ? event.target : Slick.find(event.target, '! a');
    if (!link) return;
    if (link.retrieve('widget')) return;
    var node = link.retrieve('node')
    if (!node) link.store('node', node = new LSD.Native.Anchor(link));
    node.click(event);
  }
});


/*
---
 
script: Resizable.js
 
description: Document that redraws children when window gets resized.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD.Document
  - LSD.Module.Layout
  - LSD.Module.Events
  - Core/Element.Dimensions
 
provides:
  - LSD.Document.Resizable
 
...
*/

LSD.Document.Resizable = new Class({
	
	options: {
  	events: {
  	  _resizable: {
  	    window: {
  	      resize: 'onResize'
  	    },
  	    self: {
  	      build: 'onResize'
  	    }
  	  }
  	},
  	root: true
  },
	
	onResize: function() {
	  if (document.getCoordinates) Object.append(this.style.current, document.getCoordinates());
	  this.render()
	},
	
	render: function() {
		this.childNodes.each(function(child){
		  if (child.refresh) child.refresh();
		});
	}
});
/*
---
 
script: Body.js
 
description: Lightweight document body wrapper
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:  
  - LSD/LSD.Native
  - LSD/LSD.Document
  - LSD/LSD.Document.Resizable
  - LSD/LSD.Document.Commands

provides:
  - LSD.Native.Body

...
*/

LSD.Native.Body = new Class({
  Includes: [
    LSD.Document, 
    LSD.Document.Resizable, 
    LSD.Document.Commands
  ],
  
  getSelector: false
});
/*
---
 
script: Edit.js
 
description: Turn element into editable mode
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
  - Native/LSD.Native.Body
  - Native/LSD.Native.Form
  - LSD.Trait.Form
  - LSD.Trait.Fieldset
  - LSD.Mixin.Resource

provides:
  - LSD.Action.Edit

...
*/

LSD.Action.Edit = LSD.Action.build({
  enable: function(target, content) {
    var session = this.retrieve(target);
    if (!session) {
      $ss = session = new LSD.Native.Form.Edit(target.element || target);
      this.store(target, session);
    }
    session.start(content);
  },
  
  disable: function(target) {
    var session = this.retrieve(target);
    if (session) session.hide();
  }
});

LSD.Native.Form.Edit = new Class({
  Includes: [
    LSD.Native.Body,
    LSD.Trait.Fieldset,
    LSD.Trait.Form,
    LSD.Mixin.Resource
  ],
  
  options: {
    key: null,
    layout: {
      extract: true,
      instance: true,
      children: {
        '::canceller': 'Cancel',
        '::submitter': 'Save'
      }
    },
    events: {
      self: {
        'cancel': 'finish'
      }
    },
    states: {
      hidden: true,
      editing: {
        enabler: 'start',
        disabler: 'finish'
      }
    },
    has: {
      one: {
        submitter: {
          selector: 'input[type=submit]'
        },
        canceller: {
          selector: 'button.cancel',
          events: {
            click: 'cancel'
          }
        }
      }
    }
  },
  
  initialize: function() {
    this.objects = [];
    this.parent.apply(this, arguments);
  },
  
  start: function(values) {
    Element.Item.walk.call(this, this.element, function(node, prop, scope, prefix) {
      var editable = node.getProperty('editable');
      if (editable) {
        if (prefix) prop = prefix.concat(prop).map(function(item, i) {
          return i == 0 ? item : '[' + item + ']'
        }).join('');
        this.convert(node, prop, editable);
      }
      return prefix;
    }, null, true);
    if (this.controls) this.controls.each(function(child) {
      this.element.appendChild(child.element);
    }, this);
  },

  finish: function() {
    for (var object; object = this.objects.shift();) this.revert(object);
    this.controls = this.getElements(':not(:read-write)').map(function(child) {
      child.element.parentNode.removeChild(child.element)
      return child;
    });
  },
  
  convert: function(element, name, type) {
    this.objects.push(element)
    return this.getReplacement(element, name, type).replaces(element);
  },
  
  revert: function(element) {
    element.replaces(Element.retrieve(element, 'widget:edit'));
  },
  
  cancel: function() {
    this.fireEvent('cancel', arguments)
  },
  
  submit: function() {
    if (this.getResource) {
      var Resource = this.getResource();
      new Resource(Object.append(this.getParams(), {id: this.attributes.itemid})).save(function(html) {
        this.execute({action: 'replace', target: this.element}, html);
      }.bind(this));
    }
  },
  
  getReplacement: function(element, name, type) {
    var widget = Element.retrieve(element, 'widget:edit');
    if (!widget) {
      var options = {name: name};
      widget = this.buildLayout(type == 'area' ? 'textarea' : ('input-' + (type || 'text')), this, options);
      Element.store(element, 'widget:edit', widget);
    }
    widget.setValue(Element.get(element, 'itemvalue'));
    return widget;
  }
})
/*
---
 
script: QFocuser.js
 
description: class for keyboard navigable AJAX widgets for better usability and accessibility
 
license: MIT-style license.
 
provides: [QFocuser]
 
...
*/

var QFocuser = (function() {

        // current safari doesnt support tabindex for elements, but chrome does. 
        // When Safari nightly version become current, this switch will be removed.
        var supportTabIndexOnRegularElements = (function() {
                var webKitFields = RegExp("( AppleWebKit/)([^ ]+)").exec(navigator.userAgent);
                if (!webKitFields || webKitFields.length < 3) return true; // every other browser support it
                var versionString = webKitFields[2],
                    isNightlyBuild = versionString.indexOf("+") != -1;
                if (isNightlyBuild || (/chrome/i).test(navigator.userAgent)) return true;
        })();

        return (supportTabIndexOnRegularElements ? function(widget, options) {

                var isIE = document.attachEvent && !document.addEventListener,
                        focused,
                        previousFocused,
                        lastState,
                        widgetState,
                        widgetFocusBlurTimer;

                options = (function() {
                        var defaultOptions = {
                                onFocus: function(el, e) { },
                                onBlur: function(el, e) { },
                                onWidgetFocus: function() { },
                                onWidgetBlur: function() { },
                                tabIndex: 0, // add tabindex to your widget to be attainable by tab key
                                doNotShowBrowserFocusDottedBorder: true
                        };
                        for (var option in options) defaultOptions[option] = options[option];
                        return defaultOptions;
                })();

                init();

                // something to make IE happy
                if (isIE) {
                        window.attachEvent('onunload', function() {
                                window.detachEvent('onunload', arguments.callee);
                                widget.clearAttributes();
                        });
                }

                function init() {
                        setTabIndex(widget, options.tabIndex);
                        // IE remembers focus after page reload but don't fire focus
                        if (isIE && widget == widget.ownerDocument.activeElement) widget.blur();
                        toggleEvents(true);
                };

                function hasTabIndex(el) {
                        var attr = el.getAttributeNode('tabindex');
                        return attr && attr.specified;
                };

                function setTabIndex(el, number) {
                        var test = document.createElement('div');
                        test.setAttribute('tabindex', 123);
                        var prop = hasTabIndex(test) ? 'tabindex' : 'tabIndex';
                        (setTabIndex = function(el, number) {
                                el.setAttribute(prop, '' + number);
                                if (options.doNotShowBrowserFocusDottedBorder) hideFocusBorder(el);
                        })(el, number);
                };

                function getTabIndex(el) {
                        return hasTabIndex(el) && el.tabIndex;
                };

                function hideFocusBorder(el) {
                        if (isIE) el.hideFocus = true;
                        else el.style.outline = 0;
                };

                function toggleEvents(register) {
                        var method = register ? isIE ? 'attachEvent' : 'addEventListener' : isIE ? 'detachEvent' : 'removeEventListener';
                        if (isIE) {
                                widget[method]('onfocusin', onFocusBlur);
                                widget[method]('onfocusout', onFocusBlur);
                        }
                        else {
                                widget[method]('focus', onFocusBlur, true);
                                widget[method]('blur', onFocusBlur, true);
                        }
                };

                function onFocusBlur(e) {
                        e = e || widget.ownerDocument.parentWindow.event;
                        var target = e.target || e.srcElement;
                        lastState = { focusin: 'Focus', focus: 'Focus', focusout: 'Blur', blur: 'Blur'}[e.type];
                        // filter bubling focus and blur events, only these which come from elements setted by focus method are accepted                
                        if (target == focused || target == previousFocused) {
                                options['on' + lastState](target, e);
                        }
                        clearTimeout(widgetFocusBlurTimer);
                        widgetFocusBlurTimer = setTimeout(onWidgetFocusBlur, 10);
                };

                function onWidgetFocusBlur() {
                        if (widgetState == lastState) return;
                        widgetState = lastState;
                        options['onWidget' + widgetState]();
                };

                // call this method only for mousedown, in case of mouse is involved (keys are ok)
                function focus(el) {
                        if (focused) {
                                setTabIndex(focused, -1); // to disable tab walking in widget
                                previousFocused = focused;
                        }
                        else setTabIndex(widget, -1);
                        focused = el;
                        setTabIndex(focused, 0);
                        focused.focus();
                };

                // call this method after updating widget content, to be sure that tab will be attainable by tag key
                function refresh() {
                        var setIndex = getTabIndex(widget) == -1,
                                deleteFocused = true,
                                els = widget.getElementsByTagName('*');
                        for (var i = els.length; i--; ) {
                                var idx = getTabIndex(els[i]);
                                if (idx !== false && idx >= 0) setIndex = true;
                                if (els[i] === focused) deleteFocused = false;
                        }
                        if (setIndex) setTabIndex(widget, 0);
                        if (deleteFocused) focused = null;
                };

                function getFocused() {
                        return focused;
                };

                // return element on which you should register key listeners
                function getKeyListener() {
                        return widget;
                };

                function destroy() {
                        toggleEvents();
                };

                return {
                        focus: focus,
                        getFocused: getFocused,
                        getKeyListener: getKeyListener,
                        refresh: refresh,
                        destroy: destroy
                }
        } :

        // version for Safari, it mimics focus blur behaviour
        function(widget, options) {

                var focuser,
                        lastState,
                        widgetState = 'Blur',
                        widgetFocusBlurTimer,
                        focused;

                options = (function() {
                        var defaultOptions = {
                                onFocus: function(el, e) { },
                                onBlur: function(el, e) { },
                                onWidgetFocus: function() { },
                                onWidgetBlur: function() { },
                                tabIndex: 0, // add tabindex to your widget to be attainable by tab key
                                doNotShowBrowserFocusDottedBorder: true
                        };
                        for (var option in options) defaultOptions[option] = options[option];
                        return defaultOptions;
                })();

                init();

                function init() {
                        focuser = widget.ownerDocument.createElement('input');
                        var wrapper = widget.ownerDocument.createElement('span');
                        wrapper.style.cssText = 'position: absolute; overflow: hidden; width: 0; height: 0';
                        wrapper.appendChild(focuser);
                        // it's placed in to widget, to mimics tabindex zero behaviour, where element document order matter 
                        widget.insertBefore(wrapper, widget.firstChild);
                        toggleEvent(true);
                };

                function toggleEvent(register) {
                        var method = register ? 'addEventListener' : 'removeEventListener';
                        focuser[method]('focus', onFocusBlur);
                        focuser[method]('blur', onFocusBlur);
                        window[method]('blur', onWindowBlur);
                        //widget[method]('mousedown', onWidgetMousedown);
                };

                // set active simulation
                function onWidgetMousedown(e) {
                        if (widgetState == 'Blur') {
                                setTimeout(function() {
                                        focuser.focus();
                                }, 1);
                        }
                };

                function onFocusBlur(e) {
                        lastState = e.type.charAt(0).toUpperCase() + e.type.substring(1);
                        if (focused) options['on' + lastState](focused, e);
                        clearTimeout(widgetFocusBlurTimer);
                        widgetFocusBlurTimer = setTimeout(onWidgetFocusBlur, 10);
                };

                function onWidgetFocusBlur() {
                        if (widgetState == lastState) return;
                        widgetState = lastState;
                        options['onWidget' + widgetState]();
                };

                // safari is so stupid.. doesn't fire blur event when another browser tab is switched
                function onWindowBlur() {
                        focuser.blur();
                };

                function focus(el) {
                        setTimeout(function() {
                                focuser.blur();
                                setTimeout(function() {
                                        focused = el;
                                        focuser.focus();
                                }, 1);
                        }, 1);
                };

                function refresh() {
                        var deleteFocused = true,
                                els = widget.getElementsByTagName('*');
                        for (var i = els.length; i--; ) {
                                if (els[i] === focused) deleteFocused = false;
                        }
                        if (deleteFocused) focused = null;
                };

                function getFocused() {
                        return focused;
                };

                function getKeyListener() {
                        return focuser;
                };

                function destroy() {
                        toggleEvents();
                };

                return {
                        focus: focus,
                        getFocused: getFocused,
                        getKeyListener: getKeyListener,
                        refresh: refresh,
                        destroy: destroy
                }

        });

})();
/*
---
 
script: Focus.js
 
description: A mixin to make widget take focus like a regular input (even in Safari)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - QFocuser/QFocuser
 
provides:
  - LSD.Mixin.Focus
  - LSD.Mixin.Focus.State
  - LSD.Mixin.Focus.Propagation
 
...
*/
  
LSD.Mixin.Focus = new Class({
  behaviour: '[tabindex][tabindex!=-1]',
  
  options: {
    actions: {
      focus: {
        target: false,
        enable: function(target) {
          if (target.tabindex != null) {
            target.attributes.tabindex = target.tabindex
            if (target.focuser) target.element.set('tabindex', target.tabindex)
            delete target.tabindex;
          }
          if (target.attributes.tabindex == -1) return;
          target.getFocuser();
          target.addEvents(target.events.focus);
          target.element.addEvents(target.bindEvents({mousedown: 'retain'}));
        },
        
        disable: function(target) {
          target.blur();
          if (target.options.tabindex == -1) return;
          target.tabindex = target.options.tabindex || 0;
          target.element.set('tabindex', -1)
          target.attributes.tabindex = -1;
          target.removeEvents(target.events.focus);
          target.element.removeEvents(target.bindEvents({mousedown: 'retain'}));
        }
      }
    }
  },
  
  getFocuser: Macro.getter('focuser', function() {
    return new QFocuser(this.toElement(), {
      onWidgetFocus: this.onFocus.bind(this),
      onWidgetBlur: this.onBlur.bind(this),
      tabIndex: this.getAttribute('tabindex')
    })
  }),
  
  focus: function(element) {
    if (element !== false) {
      this.getFocuser().focus(element || this.element);
      this.document.activeElement = this;
    }
    if (this.focused) return;
    this.focused = true;
    this.fireEvent('focus', arguments);
    this.onStateChange('focused', true);
    LSD.Mixin.Focus.Propagation.focus(this);
  },
  
  blur: function(propagated) {
    if (!this.focused) return;
    this.focused = false;
    this.fireEvent('blur', arguments);
    this.onStateChange('focused', false);
    if (!propagated) LSD.Mixin.Focus.Propagation.blur.delay(10, this, this);
  },
  
  retain: function(e) {
    if (e) e.stop();
    this.focus();
  },
  
  onFocus: Macro.defaults(function() {
    this.focus(false);
    this.document.activeElement = this;
  }),
  
  onBlur: Macro.defaults(function() {
    var active = this.document.activeElement;
    if (active == this) delete this.document.activeElement;
    while (active && (active = active.parentNode)) if (active == this) return;
    this.blur();
  }),
  
  getKeyListener: function() {
    return this.getFocuser().getKeyListener()
  }
});

LSD.Mixin.Focus.Propagation = {
  focus: function(parent) {
    while (parent = parent.parentNode) if (parent.getFocuser) parent.focus(false);
  },
  
  blur: function(parent) {
    var active = parent.document.activeElement;
    var hierarchy = [];
    if (active) {
      for (var widget = active; widget.parentNode && hierarchy.push(widget); widget = widget.parentNode);
    }
    while (parent = parent.parentNode) {
      if (active && hierarchy.contains(parent)) break;
      if (parent.options && (parent.attributes.tabindex != null) && parent.blur) parent.blur(true);
    }
  }
};
/*
---
 
script: Select.js
 
description: Basic selectbox
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD/LSD.Widget
- LSD.Widget.Button
- LSD/LSD.Trait.Menu
- LSD/LSD.Trait.List
- LSD/LSD.Trait.Choice
- LSD/LSD.Mixin.Focus

provides: [LSD.Widget.Select, LSD.Widget.Select.Button, LSD.Widget.Select.Option]
 
...
*/

LSD.Widget.Select = new Class({
  
  Includes: [
    LSD.Widget,
    LSD.Trait.Menu,
    LSD.Trait.List,
    LSD.Trait.Choice
  ],
  
  options: {
    tag: 'select',
    events: {
      _select: {
        element: {
          click: 'expand'
        },
        self: {
          set: function(item) {
            this.setValue(item.getValue());
            this.write(item.getTitle());
            this.collapse();
          },
          collapse: 'forgetChosenItem'
        }
      }
    },
    shortcuts: {
      'ok': 'selectChosenItem'
    },
    menu: {
      position: 'focus',
      width: 'adapt'
    },
    writable: true,
    layout: {
      children: Array.fast('::button')
    },
    has: {
      many: {
        items: {
          layout: 'select-option',
          mutation: '> option, > li',
          relay: {
            mouseover: function() {
              if (!this.chosen) this.listWidget.selectItem(this, true)
            },
            click: function(event) {
              if (!this.select()) this.listWidget.collapse();
              if (event) event.stop();
              this.forget();
            }
          }
        }
      },
      one: {
        menu: {
          proxy: function(widget) {
            if (!widget.pseudos.item) return;
            if (!this.getSelectedItem() || widget.pseudos.selected) this.selectItem(widget)
            return true;
          }
        },
        button: {
          selector: 'button',
          layout: 'select-button'
        }
      }
    }
  }
});

LSD.Widget.Select.Button = new Class({
  Extends: LSD.Widget.Button
});

LSD.Widget.Select.Option = new Class({
  Extends: LSD.Widget,
  
  options: {
    tag: 'option',
    pseudos: Array.fast('item')
  },
  
  getTitle: function() {
    return this.element.get('text').trim();
  },
  
  getValue: function() {
    return this.attributes.value || this.element.get('text').trim();
  }
});

LSD.Widget.Select.Option.prototype.addStates('chosen', 'selected');
/*
---
 
script: Input.js
 
description: Make it easy to use regular native input for the widget
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
  - LSD.Mixin.Focus

provides: 
  - LSD.Trait.Input
  
...
*/

LSD.Trait.Input = new Class({
  options: {
    input: {},
    events: {
      input: {
        element:  {
          mousedown: function(e) {
            e.stopPropagation()
          }
        },
        self: {
          attach: function() {
            this.getInput().addEvents({
              blur: this.onBlur.bind(this),
              focus: this.onFocus.bind(this)
            });
          },
          build: function() {
            this.getInput().inject(this.element);
          },
          focus: function() {
            this.document.activeElement = this;
            if (LSD.Mixin.Focus) LSD.Mixin.Focus.Propagation.focus(this);
          },
          blur: function() {
              if (this.document.activeElement == this) delete this.document.activeElement;
           //   if (LSD.Mixin.Focus) LSD.Mixin.Focus.Propagation.blur.delay(10, this, this);
          },
          resize: 'setInputSize'
        }
      }
    }
  },
  
  onFocus: function() {
    this.document.activeElement = this;
    this.focus();
  },
  
  getInput: Macro.getter('input', function() {
    var input = new Element('input', Object.append({'type': 'text'}, this.options.input));
    this.fireEvent('register', ['input', resizer]);
    return input;
  }),
  
  setInputSize: function(size) {
    var height = size.height - this.input.getStyle('padding-top').toInt() - this.input.getStyle('padding-bottom').toInt();
    if (this.input.style.height != height + 'px') this.input.setStyle('height', height);
    if (this.input.style.lineHeight != height + 'px') this.input.setStyle('line-height', height);
    var width = this.size.width - this.input.getStyle('padding-left').toInt() - this.input.getStyle('padding-right').toInt();
    if (this.style.current.glyph) {
      var glyph = this.layers.glyph.measure().width + (this.style.current.glyphRight || 0) + (this.style.current.glyphLeft || 0);
      width -= glyph;
      this.input.setStyle('margin-left', glyph);
    }
    if (this.canceller) width -= this.canceller.getLayoutWidth();
    if (this.glyph) width -= this.glyph.getLayoutWidth();
    this.input.setStyle('width', width);
  },
  
  getObservedElement: function() {
    return this.getInput();
  },
  
  empty: function() {
    this.input.set('value', '')
  }
});
/*
---
 
script: Input.js
 
description: A base class for all kinds of form controls
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Widget
  - LSD/LSD.Trait.Input
  - LSD/LSD.Mixin.Focus

provides: 
  - LSD.Widget.Input
 
...
*/
LSD.Widget.Input = new Class({
  Includes: [
    LSD.Widget,
    LSD.Trait.Input
  ],
  
  options: {
    tag: 'input',
    attributes: {
      type: 'text'
    },
    focusable: false,
    writable: true,
    events: {
      _input: {
        focus: function() {
          this.input.focus();
        },
        blur: function() {
          this.input.blur();
        }
      }
    },
    states: Array.fast('focused')
  },
  
  retain: function() {
    this.focus(false);
    return false;
  },
  
  applyValue: function(item) {
    this.input.set('value', item);
  }
});

LSD.Widget.Input.prototype.addState('focused');
/*
---
 
script: Range.js
 
description: Range slider input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Widget.Input
- LSD.Widget.Button
- LSD/LSD.Widget
- LSD/LSD.Trait.Slider
- LSD/LSD.Mixin.Focus

provides: [LSD.Widget.Input.Range]
 
...
*/

LSD.Widget.Input.Range = new Class({
  Includes: [
    LSD.Widget,
    LSD.Trait.Slider
  ],
  
  options: {
    tag: 'input',
    shortcuts: {
      next: 'increment',
      previous: 'decrement'
    },
    layout: {
      children: Array.fast('::thumb')
    },
    has: {
      one: {
        thumb: {
          selector: 'thumb',
          layout: 'input-range-thumb'
        }
      }
    },
    writable: true
  },
  
  initialize: function() {
    //delete this.options.events.focus.element.mousedown;
    this.parent.apply(this, arguments);
    this.addPseudo(this.options.mode);
  },

  onSet: function() {
    this.focus();
    this.setValue(arguments[0]);
  }
});

LSD.Widget.Input.Range.Thumb = new Class({
  Extends: LSD.Widget.Button,
    
  options: {
    tag: 'thumb'
  }
});
/*
---
 
script: Radio.js
 
description: A radio button, set of connected widgets that steal checkedness from each other
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Widget.Input
- LSD/LSD.Widget
- LSD/LSD.Mixin.Touchable
- LSD/LSD.Mixin.Focus

provides: [LSD.Widget.Input.Radio]
 
...
*/

LSD.Widget.Input.Radio = new Class({
  Extends: LSD.Widget,
  
  options: {
    tag: 'input',
    shortcuts: {
      space: 'click'
    },
    command: {
      type: 'radio'
    },
    events: {
      enabled: {
        element: {
          click: 'click'
        }
      }
    },
    writable: true
  },

  click: function(event){
    if (event && event.preventDefault) event.preventDefault();
    if (!this.disabled) return this.parent.apply(this, arguments);
  }
});
/*
---
 
script: Checkbox.js
 
description: Boolean checkbox type of input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Widget.Input
- LSD/LSD.Mixin.Touchable
- LSD/LSD.Mixin.Focus

provides: [LSD.Widget.Input.Checkbox]
 
...
*/
LSD.Widget.Input.Checkbox = new Class({
  Extends: LSD.Widget,
  
  options: {
    tag: 'input',
    shortcuts: {
      space: 'toggle'
    },
    command: {
      type: 'checkbox'
    },
    events: {
      enabled: {
        element: {
          click: 'click'
        }
      }
    },
    writable: true
  },
  
  click: function(event){
    if (event && event.preventDefault) event.preventDefault();
    if (!this.disabled) return this.parent.apply(this, arguments);
  }
});
/*
---
 
script: Wrongler.js
 
description: Basic script
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel

provides:
  - Wrongler
 
...
*/

if(!Wrongler) var Wrongler = {};
/*
---
 
script: Widget.js
 
description: Basic widget
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler
  - LSD/LSD.Type

provides:
  - Wrongler.Widget
 
...
*/

new LSD.Type('Widget', 'Wrongler');

// Inject native widgets into default widget pool as a fallback
LSD.Element.pool.unshift(Wrongler.Widget);
/*
---
 
script: Body.js
 
description: Body widget
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler.Widget
  - Native/LSD.Native.Body

provides:
  - Wrongler.Widget.Body
 
...
*/

Wrongler.Widget.Body = LSD.Native.Body;
/*
---
 
script: Dialog.js
 
description: An in-page independent document (like iphone app page)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Body
  - Native/LSD.Native.Body
  - LSD/LSD.Trait.Fieldset

provides:
  - Wrongler.Widget.Body.Dialog

...
*/

Wrongler.Widget.Body.Dialog = new Class({
  Includes: [
    LSD.Native.Body,
    LSD.Trait.Fieldset
  ],
  
  options: {
    tag: 'dialog',
    pseudos: Array.fast('submittable'),
    nodeType: 1,
    element: {
      tag: 'section'
    },
    transformation: {
      name: 'pop'
    },
    events: {
      _dialog: {
        element: {
          'click:relay(.cancel)': 'cancel'
        },
        self: {
          show: 'build',
          build: function() {
            this.element.inject(this.options.caller());
          }
        }
      }
    },
    has: {
      one: {
        'form': {
          selector: 'form',
          chain: {
            'submission': function() {
              return {action: 'send', target: this.document}
            }
          }
        }
      }
    }
  },
  
  cancel: function() {
    this.hide();
    this.fireEvent('cancel', arguments);
  },
  
  submit: function() {
    this.hide();
    this.fireEvent('submit', arguments);
  },
  
  getData: function() {
    return (this.form ? this.form.getData : this.parent).apply(this.form || this, arguments);
  },
  
  hidden: true
});
/*
---
 
script: Dialog.Lightbox.js
 
description: An in-page independent document (like iphone app page)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Body.Dialog
  - LSD/LSD.Mixin.Focus

provides:
  - Wrongler.Widget.Body.Dialog.Lightbox

...
*/

Wrongler.Widget.Body.Dialog.Lightbox = new Class({
  Extends: Wrongler.Widget.Body.Dialog,

  options: {
    tag: 'lightbox',
    container: {
      enabled: true
    },
    events : {
      _lightbox: {
        self: {
          build: function(){
            this.overlay = new Element('div', {
              'class': 'overlay',
              events: {
                click: function(){
                  this.cancel();
                }.bind(this)
              }
            }).inject(this.element);
            this.addEvent('destroy', this.overlay.destroy.bind(this.overlay));
          }
        }
      }
    }
  }
});
/*
---
 
script: Animated.js
 
description: Basic widget animated
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler.Widget
  - LSD/LSD.Native
  - LSD/LSD.Mixin.Animation
  - LSD/LSD.Mixin.Focus
  - Core/Fx.Transitions

provides:
  - Wrongler.Widget.Animated
 
...
*/

Wrongler.Widget.Animated = new Class({
  Extends: LSD.Native,
  
  options: {
    tag: 'widget',
    animation: {
      duration: 350,
      transition: 'circ:out'
    }
  }
});
/*
---
 
script: Input.js
 
description: A base class for all kinds of form controls
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler.Widget
  - Native/LSD.Native.Input.*
  - LSD/LSD.Mixin.Placeholder

provides:
  - Wrongler.Widget.Input
 
...
*/

Wrongler.Widget.Input = LSD.Native.Input;
/*
---
 
script: Checkbox.js
 
description: Boolean checkbox type of input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Input
  - Widgets/LSD.Widget.Input.Checkbox

provides: [Wrongler.Widget.Input.Checkbox]
 
...
*/

Wrongler.Widget.Input.Checkbox = new Class({
  Extends: LSD.Widget.Input.Checkbox,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});
/*
---
 
script: Radio.js
 
description: A radio button, set of connected widgets that steal checkedness from each other
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
 - Wrongler.Widget.Input
 - Widgets/LSD.Widget.Input.Radio

provides: [Wrongler.Widget.Input.Radio]
 
...
*/

Wrongler.Widget.Input.Radio = new Class({
  Extends: LSD.Widget.Input.Radio,
  
  options: {
    element: {
      tag: 'div'
    },
    events: {
      _radio: {
        self: {
          uncheck: 'callChain'
        }
      }
    }
  }
});
/*
---
 
script: Range.js
 
description: Range slider input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Input
  - Widgets/LSD.Widget.Input.Range

provides: [Wrongler.Widget.Input.Range]
 
...
*/

Wrongler.Widget.Input.Range = new Class({
  Extends: LSD.Widget.Input.Range,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});

Wrongler.Widget.Input.Range.Thumb = LSD.Widget.Input.Range.Thumb;
/*
---
 
script: Date.js
 
description: Date picker input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Input
  - Native/LSD.Native.Table.Calendar
  - LSD/LSD.Widget
  - LSD/LSD.Trait.Date

provides: 
  - Wrongler.Widget.Input.Date

...
*/

Wrongler.Widget.Input.Date = new Class({
  Includes: [
    LSD.Widget,
    LSD.Trait.Date
  ],
  
  options: {
    tag: 'input',
    attributes: {
      type: 'date'
    },
    element: {
      tag: 'div'
    },
    date: {
      format: '%d %b %Y'
    },
    shortcuts: {
      cancel: 'cancel'
    },
    events: {
      _date: {
        element: {
          click: 'expand'
        },
        self: {
          blur: 'collapse',
          dominject: function(){
            this.setDate(this.getDate());
          }
        } 
      }
    },
    writable: true,
    layout: {
      children: Array.fast('::button')
    },
    has: {
      one: {
        button: {
          selector: 'button',
          layout: 'select-button'
        },
        datepicker: {
          selector: ':datepicker',
          layout: 'datepicker',
          events: {
            self: {
              selectDate: function(date){
                this.listWidget.setDate(date);
                this.listWidget.collapse();
              }
            },
            element: {
              click: function(event){
                if (event) event.stop();
              }
            }
          }
        }
      }
    },
    states: Array.fast('expanded')
  },
  
  setDate: function(date) {
    this.parent.apply(this, arguments);
    if (date){
      this.setValue(this.formatDate(date));
      this.write(this.formatDate(date));
    };
    if (this.datepicker) this.datepicker.setDate(date);
  },
  
  cancel: function() {
    this.collapse();
  },
  
  buildDatepicker: function(){
    return this.buildLayout(this.options.layout.datepicker);
  },
  
  expand: function() {
    if (!this.datepicker){
      this.datepicker = this.buildDatepicker();
      this.datepicker.listWidget = this;
    };
    this.datepicker.show();
  },
  
  collapse: function(){
    if(this.datepicker) this.datepicker.hide();
  }
});

Wrongler.Widget.Datepicker = new Class({
  Includes: [
    LSD.Widget,
    LSD.Trait.Date
  ],
  
  options: {
    attributes: {
      animation: 'fade'
    },
    animation: {
      duration: 350,
      transition: 'circ:out'
    },
    classes: Array.fast('datepicker'),
    pseudos: Array.fast('datepicker'),
    writable: true,
    layout: {
      children: {
        '.arrow::decrementor': 'Previous month',
        '.arrow::incrementor': 'Next month',
        '::table': true
      }
    },
    has: {
      one: {
        table: {
          selector: 'table[type=calendar]',
          events: {
            set: 'selectDate'
          }
        },
        decrementor: {
          selector: 'button#decrement',
          events: {
            click: 'decrement'
          }
        },
        incrementor: {
          selector: 'button#increment',
          events: {
            click: 'increment'
          }
        }
      }
    }
  },
  
  getData: function() {
    return this.date;
  },
  
  setDate: function(date) {
    this.parent.apply(this, arguments);
    this.table.setDate(date);
  },
  
  selectDate: function(date) {
    this.setDate(date);
    this.fireEvent('onSelectDate', date);
  }  
});
/*
---
 
script: Select.js
 
description: Basic selectbox
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget
  - Widgets/LSD.Widget.Select

provides: [Wrongler.Widget.Select, Wrongler.Widget.Select.Button, Wrongler.Widget.Select.Option]

...
*/

Wrongler.Widget.Select = new Class({
  Extends: LSD.Widget.Select,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});

Wrongler.Widget.Select.Button = LSD.Widget.Select.Button;

Wrongler.Widget.Select.Option = new Class({
  Extends: LSD.Widget.Select.Option,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});

Wrongler.Widget.Menu = LSD.Widget.Menu;

Wrongler.Widget.Menu.Context = new Class({
  Extends: LSD.Widget.Menu.Context,
  
  options: {
    attributes: {
      animation: 'fade'
    },
    animation: {
      duration: 350,
      transition: 'circ:out' 
    }
  }
});
/*
---
 
script: Application.js
 
description: Main script of application
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler
  - Wrongler.Widget.*
  - Native/LSD.Native.Form
  - Native/LSD.Native.Textarea
  - Native/LSD.Native.Button
  - Native/LSD.Native.Label
  - LSD/LSD.Action.*
  - LSD/LSD.Application
  
provides:
  - Wrongler.Application
 
...
*/

Wrongler.Application = new LSD.Application(document);

// Transformations
Wrongler.Transformations = {
  'a.button': 'button',
  'a.button[type="submit"]': 'input[type="submit"]',
  'div[animation]': 'animated'
};
Wrongler.Widget.Body.prototype.options.mutations = Wrongler.Transformations;
Wrongler.Widget.Body.prototype.options.layout.options.context = 'element';