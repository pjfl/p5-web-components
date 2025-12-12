if (!window.WCom) window.WCom = {};
/** @namespace
    @classdesc Web Components Utilities
    @desc Exports mixins
    @example Object.assign(YourClass.prototype, WCom.Util.Markup);
    @alias WCom/Util
*/
WCom.Util = (function() {
   /** @class
       @classdesc The fetch API can be improved upon. A plain object can
          be passed for headers, forms are posted with either encoding type.
          JSON can be posted different response types returned
       @alias Util/Bitch
   */
   class Bitch {
      /** @function
          @desc Fetches the response to a POST request
          @param {URI} url - Where to post the request
          @param {object} options - Control parameters for the fetch call
          @property {string} options.enctype The encoding type
          @property {array} options.files The first element is the file
              to be posted
          @property {object} options.form The form to be posted
          @property {object} options.headers An opaque Headers
              object is constructed from this plain object
          @property {object} options.json Set the body to this and the content
              type to 'application/json'
          @property {string} options.method Defaults to POST
          @property {string} options.response Either 'text' (default),
              'object', or 'response'
          @returns {object} Properties may include; 'location' and 'status' as
              well as the response type requested
      */
      async blows(url, options = {}) {
         let want = options.response || 'text'; delete options.response;
         this._setHeaders(options);
         if (options.form) {
            const form = options.form; delete options.form;
            const data = new FormData(form);
            data.set('_submit', form.getAttribute('submitter'));
            const type = options.enctype
                  || form.getAttribute('enctype')
                  || 'application/x-www-form-urlencoded';
            delete options.enctype;
            if (type == 'multipart/form-data') {
               const files = options.files; delete options.files;
               if (files && files[0]) data.append('file', files[0]);
               options.body = data;
            }
            else {
               options.headers.set('Content-Type', type);
               const params = new URLSearchParams(data);
               options.body = params.toString();
            }
         }
         if (options.json) {
            options.headers.set('Content-Type', 'application/json');
            options.body = options.json; delete options.json;
            want = 'object';
         }
         options.method ||= 'POST';
         if (options.method == 'POST') {
            options.cache ||= 'no-store';
            options.credentials ||= 'same-origin';
         }
         const response = await fetch(url, options);
         if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.statusText}`);
         }
         const headers = response.headers;
         const location = headers.get('location');
         if (location && want != 'response') {
            const reload_header = headers.get('x-force-reload');
            const reload = reload_header == 'true' ? true : false;
            return { location, reload, status: 302 };
         }
         if (want == 'object') return {
            object: await response.json(), status: response.status
         };
         if (want == 'text') return {
            status: response.status, text: await response.text()
         };
         return { response };
      }
      /** @function
          @desc Fetches the response to a GET request
          @param {URI} url Where to get the response from
          @param {object} options Control parameters for the fetch call
          @property {object} options.headers An opaque Headers object is
             constructed from this plain object
          @property {string} options.method Defaults to GET
          @property {string} options.response Either 'blob', 'object' (default),
             'text', or 'response'
          @returns {object} Properties may include; 'filename', 'location'
              and 'status' as well as the response type requested
      */
      async sucks(url, options = {}) {
         const want = options.response || 'object'; delete options.response;
         this._setHeaders(options);
         options.method ||= 'GET';
         const response = await fetch(url, options);
         if (!response.ok) {
            if (want == 'object') {
               console.warn(`HTTP error! Status: ${response.statusText}`);
               return { object: false, status: response.status };
            }
            throw new Error(`HTTP error! Status: ${response.statusText}`);
         }
         const headers = response.headers;
         const location = headers.get('location');
         if (location) return { location, status: 302 };
         if (want == 'blob') {
            const key = 'content-disposition';
            const { filename } = this._dispositionParser(headers.get(key));
            const blob = await response.blob();
            return { blob, filename, status: response.status };
         }
         if (want == 'object') return {
            object: await response.json(), status: response.status
         };
         if (want == 'text') return {
            status: response.status,
            text: await new Response(await response.blob()).text()
         };
         return { response };
      }
      _newHeaders() {
         const headers = new Headers();
         headers.set('X-Requested-With', 'XMLHttpRequest');
         return headers;
      }
      _setHeaders(options) {
         if (!options.headers) options.headers = this._newHeaders();
         if (!(options.headers instanceof Headers)) {
            const headers = options.headers;
            options.headers = this._newHeaders();
            for (const [k, v] of Object.entries(headers))
               options.headers.set(k, v);
         }
      }
      // https://github.com/yurks/content-disposition-parser
      _dispositionParser(data) {
         if (!(data && typeof data === 'string')) return;
         const reParamSplit = /\s*;\s*/;
         const reHeaderSplit = /\s*:\s*/;
         const rePropertySplit = /\s*=\s*(.+)/;
         const reEncodingSplit = /\s*'[^']*'\s*(.*)/;
         const reQuotesTrim = /(?:^["'\s]*)|(?:["'\s]*$)/g;
         const headerSplit = data.split(reParamSplit)
               .map(item => item.trim())
               .filter(item => !!item)
         let type = headerSplit.shift()
         if (!type) return;
         type = type.toLowerCase().split(reHeaderSplit)
         type = type[1] || type[0]
         return headerSplit
            .map(prop => prop.split(rePropertySplit))
            .reduce((o, [key, value]) => {
               if (!value) { o[key] = true }
               else if (key.slice(-1) === '*') {
                  let encoding
                  [encoding, value] = value.split(reEncodingSplit)
                  if (value) {
                     try { value = decodeURIComponent(value) }
                     catch (e) { }
                     o[key.slice(0, -1).toLowerCase()] = value
                  }
                  o.encoding = encoding.toLowerCase()
               } else if (!(key in o)) {
                  o[key.toLowerCase()] = value.replace(reQuotesTrim, '')
               }
               return o
            }, { type });
      }
   }
   /** @class
       @classdesc The document createElement API is sub optimal. The methods
          here mostly generate markup whilst setting attributes and appending
          content. The class supports more HTML elements than are listed here
       @alias Util/HtmlTiny
   */
   class HtmlTiny {
      /** @function
          @desc Return markup for an anchor element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      a(attr, content)        { return this._tag('a', attr, content) }
      canvas(attr, content)   { return this._tag('canvas', attr, content) }
      caption(attr, content)  { return this._tag('caption', attr, content) }
      datalist(attr, content) { return this._tag('datalist', attr, content) }
      /** @function
          @desc Return markup for a div element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      div(attr, content)      { return this._tag('div', attr, content) }
      fieldset(attr, content) { return this._tag('fieldset', attr, content) }
      figure(attr, content)   { return this._tag('figure', attr, content) }
      /** @function
          @desc Return markup for a form element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      form(attr, content)     { return this._tag('form', attr, content) }
      /** @function
          @desc Return markup for an h1 element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      h1(attr, content)       { return this._tag('h1', attr, content) }
      h2(attr, content)       { return this._tag('h2', attr, content) }
      h3(attr, content)       { return this._tag('h3', attr, content) }
      h4(attr, content)       { return this._tag('h4', attr, content) }
      h5(attr, content)       { return this._tag('h5', attr, content) }
      /** @function
          @desc Return markup for an image element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      img(attr)               { return this._tag('img', attr) }
      /** @function
          @desc Return markup for an input element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      input(attr, content)    { return this._tag('input', attr, content) }
      label(attr, content)    { return this._tag('label', attr, content) }
      legend(attr, content)   { return this._tag('legend', attr, content) }
      li(attr, content)       { return this._tag('li', attr, content) }
      nav(attr, content)      { return this._tag('nav', attr, content) }
      optgroup(attr, content) { return this._tag('optgroup', attr, content) }
      option(attr, content)   { return this._tag('option', attr, content) }
      /** @function
          @desc Return markup for a select element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      select(attr, content)   { return this._tag('select', attr, content) }
      span(attr, content)     { return this._tag('span', attr, content) }
      strong(attr, content)   { return this._tag('strong', attr, content) }
      table(attr, content)    { return this._tag('table', attr, content) }
      tbody(attr, content)    { return this._tag('tbody', attr, content) }
      td(attr, content)       { return this._tag('td', attr, content) }
      /** @function
          @desc Return markup for a textarea element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      textarea(attr, content) { return this._tag('textarea', attr, content) }
      th(attr, content)       { return this._tag('th', attr, content) }
      thead(attr, content)    { return this._tag('thead', attr, content) }
      tr(attr, content)       { return this._tag('tr', attr, content) }
      ul(attr, content)       { return this._tag('ul', attr, content) }
      upload(attr, content)   { return this._tag('upload', attr, content) }
      /** @function
          @desc Return markup for a button input element
          @param {object} attr Attributes to set on the document element
          @param {array} content An array of content appened to the element
          @returns {string}
      */
      button(attr, content) {
         if (this._typeof(attr) == 'object') attr['type'] ||= 'submit';
         else {
            content = attr;
            attr = { type: 'submit' };
         }
         return this._tag('button', attr, content);
      }
      /** @function
          @desc Return markup for a checkbox input element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      checkbox(attr) {
         attr['type'] = 'checkbox';
         return this._tag('input', attr);
      }
      /** @function
          @desc Return markup for a colour picker input element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      colour(attr) {
         attr['type'] = 'color';
         return this._tag('input', attr);
      }
      /** @function
          @desc Return markup for a file element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      file(attr) {
         attr['type'] = 'file';
         return this._tag('input', attr);
      }
      /** @function
          @desc Return markup for a hidden input element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      hidden(attr) {
         attr['type'] = 'hidden';
         return this._tag('input', attr);
      }
      /** @function
          @desc Return markup for a SVG element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      icon(attr) {
         const {
            attrs = {}, className, height = 20, icons, name, onclick,
            presentational = true, title, width = 20
         } = attr;
         if (Array.isArray(className)) className = `${className.join(' ')}`;
         const newAttrs = {
            'aria-hidden': presentational ? 'true' : null,
            class: className, height, width, ...attrs
         };
         const svg = `
<svg ${Object.keys(newAttrs).filter(attr => newAttrs[attr]).map(attr => `${attr}="${newAttrs[attr]}"`).join(' ')}>
   <use href="${icons}#icon-${name}"></use>
</svg>`;
         const wrapperAttr = { className: 'icon-wrapper' };
         if (onclick) wrapperAttr.onclick = onclick;
         if (title) wrapperAttr.title = title;
         return this.span(wrapperAttr, this._frag(svg.trim()));
      }
      /** @function
          @desc Return markup for a radio button input element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      radio(attr) {
         attr['type'] = 'radio';
         return this._tag('input', attr);
      }
      /** @function
          @desc Return markup for a text input element
          @param {object} attr Attributes to set on the document element
          @returns {string}
      */
      text(attr) {
         attr['type'] = 'text';
         return this._tag('input', attr);
      }
      /** @function
          @desc Returns 'element' and 'array' types in addition
             to the built in ones
          @param {variable} x The variable to test
          @returns {string}
      */
      typeOf(x) { return this._typeof(x) }
      /** @function
          @desc Return the co-ordinates where the event takes place
          @param {event} event Event whose co-ordinates are being returned
          @param {string} key Defaults to page
      */
      getCoords(event, coordKey = 'page') {
         const x = `${coordKey}X`;
         const y = `${coordKey}Y`;
         return {
            x: x in event ? event[x] : event.pageX,
            y: y in event ? event[y] : event.pageY,
         };
      }
      /** @function
          @desc Returns the height and width of the supplied element
          @param {element} el The element whose dimensions are being returned
          @returns {object} Properties; 'height', and 'width'
      */
      getDimensions(el) {
         if (!el) return { height: 0, width: 0 };
         const style = el.style || {};
         if (style.display && style.display !== 'none') {
            return { height: el.offsetHeight, width: el.offsetWidth };
         }
         const originalStyles = {
            display: style.display,
            position: style.position,
            visibility: style.visibility
         };
         const newStyles = { display: 'block', visibility: 'hidden' }
         if (originalStyles.position !== 'fixed')
            newStyles.position = 'absolute';
         for (const p in newStyles) style[p] = newStyles[p];
         const dimensions = { height: el.offsetHeight, width: el.offsetWidth };
         for (const p in newStyles) style[p] = originalStyles[p];
         return dimensions;
      }
      /** @function
          @desc Returns the offsets of the parents of the supplied element
          @param {element} el Find the offsets of this elements parents
          @param {element} stop Stop traversing the parent chain at this element
          @returns {object} Properties; 'top', and 'left'
      */
      getElementOffset(el, stopEl) {
         let valueT = 0;
         let valueL = 0;
         do {
            if (el) {
               valueT += el.offsetTop  || 0;
               valueL += el.offsetLeft || 0;
               el = el.offsetParent;
               if (stopEl && el == stopEl) break;
            }
         } while (el);
         return { left: Math.round(valueL), top: Math.round(valueT) };
      }
      /** @function
          @desc Return the offsets to the element with window scroll added
             in pixels
          @param {element} el Return the offsets for this element
          @returns {object} Properties; 'top', 'right', 'bottom', and 'left'
      */
      getOffset(el) {
         const rect = el.getBoundingClientRect();
         return {
            top: Math.round(rect.top + window.scrollY),
            right: Math.round(rect.right + window.scrollX),
            bottom: Math.round(rect.bottom + window.scrollY),
            left: Math.round(rect.left + window.scrollX),
         };
      }
      /** @function
          @private
          @desc Returns elements created from the fragment of markup provided
          @param {string} content Fragment of markup
          @returns {element}
      */
      _frag(content) {
         return document.createRange().createContextualFragment(content);
      }
      _tag(tag, attr, content) {
         const events = [
            'onchange', 'onclick', 'ondragenter', 'ondragleave', 'ondragover',
            'ondragstart', 'ondrop', 'oninput', 'onkeypress', 'onmousedown',
            'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseover',
            'onsubmit'
         ];
         const htmlProps = [
            'colorspace', 'disabled', 'inputmode', 'list', 'max', 'maxlength',
            'min', 'minlength', 'readonly', 'required'
         ];
         const styleProps = [ 'height', 'width' ];
         const el = document.createElement(tag);
         const type = this._typeof(attr);
         if (type == 'object') {
            for (const prop of Object.keys(attr)) {
               if (events.includes(prop)) {
                  el.addEventListener(prop.replace(/^on/, ''), attr[prop]);
               }
               else if (htmlProps.includes(prop)) {
                  el.setAttribute(prop, attr[prop]);
               }
               else if (styleProps.includes(prop)) {
                  el.style[prop] = attr[prop];
               }
               else {
                  el[prop] = attr[prop];
               }
            }
         }
         else if (type == 'array')   { content = attr; }
         else if (type == 'element') { content = [attr]; }
         else if (type == 'string')  { content = [attr]; }
         if (!content) return el;
         if (this._typeof(content) != 'array') content = [content];
         for (const child of content) {
            const childType = this._typeof(child);
            if (!childType) continue;
            if (childType == 'number' || childType == 'string') {
               el.appendChild(document.createTextNode(child));
            }
            else { el.appendChild(child); }
         }
         return el;
      }
      _typeof(x) {
         if (!x) return;
         const type = typeof x;
         if ((type == 'object') && (x.nodeType == 1)
             && (typeof x.style == 'object')
             && (typeof x.ownerDocument == 'object')) return 'element';
         if (type == 'object' && Array.isArray(x)) return 'array';
         return type;
      }
   }
   const esc = encodeURIComponent;
   const createQueryString = function(obj, traditional = true) {
      if (!obj) return '';
      return Object.entries(obj)
         .filter(([key, val]) => val)
         .reduce((acc, [k, v]) => {
            if (traditional && Array.isArray(v)) {
               return acc.concat(v.map(i => `${esc(k)}=${esc(i)}`));
            }
            return acc.concat(`${esc(k)}=${esc(v)}`);
         }, []).join('&');
   };
   const registeredOnloadCallbacks = [];
   const registeredOnunloadCallbacks = [];
   const ucfirst = function(s) {
      return s && s[0].toUpperCase() + s.slice(1) || '';
   };
   return {
      /** @mixin
          @classdesc Exports wrapper methods for 'fetch' with an improved API
          @alias WCom.Util/Bitch
       */
      Bitch: {
         /** @instance
             @desc An instance of class {@link Util/Bitch}
          */
         bitch: new Bitch(),
      },
      /** @mixin
          @classdesc Exports event related methods
          @alias WCom.Util/Event
       */
      Event: {
         /** @function
             @async
             @desc Execute the registered onload callbacks
             @param {element} el Passed as the first argument to each callback
             @param {object} options Second arguement passed to the callbacks
         */
         onLoad: async function(el, o) {
            for (const cb of registeredOnloadCallbacks) await cb(el, o);
         },
         /** @function
             @desc When the document is ready execute the supplied callback
             @param {function} cb Callback function being executed
         */
         onReady: function(cb) {
            if (document.readyState != 'loading') cb();
            else if (document.addEventListener)
               document.addEventListener('DOMContentLoaded', cb);
            else document.attachEvent('onreadystatechange', function() {
               if (document.readyState == 'complete') cb();
            });
         },
         /** @function
             @desc Execute the registered unload callbacks
         */
         onUnload: function() {
            for (const cb of registeredOnunloadCallbacks) cb();
         },
         /** @function
             @desc Register the supplied onload callback
             @param {function} cb Callback function being registered
             @returns {integer}
         */
         registerOnload: function(cb) {
            registeredOnloadCallbacks.push(cb);
            return registeredOnloadCallbacks.length;
         },
         /** @function
             @desc Register the supplied unload callback
             @param {function} cb Callback function being registered
             @returns {integer}
         */
         registerOnunload: function(cb) {
            registeredOnunloadCallbacks.push(cb);
            return registeredOnunloadCallbacks.length;
         },
         /** @function
             @desc Unregister the onload callback. The 'index' was returned by
                the register call
             @param {integer} index Index of the callback to remove
         */
         unregisterOnload: function(index) {
            registeredOnloadCallbacks.splice(index - 1, 1);
         },
         /** @function
             @desc Unregister the unload callback. The 'index' was returned by
                the register call
             @param {integer} index Index of the callback to remove
         */
         unregisterOnunload: function(index) {
            registeredOnunloadCallbacks.splice(index - 1, 1);
         }
      },
      /** @mixin
          @classdesc Exports markup related members and methods
          @alias WCom.Util/Markup
       */
      Markup: {
         /** @function
             @desc Adds or replaces an element in the container
             @example this.foo = this.addReplace( container, 'foo', element );
             @param {element} container Container element
             @param {string} attribute Attribute on the self referential object
             @param {element} el Adds to or replaces the element in the
               container with this one
             @returns {element} The replacement element
          */
         addReplace: function(container, attribute, el) {
            if (this[attribute] && container.contains(this[attribute])) {
               container.replaceChild(el, this[attribute]);
            }
            else { container.appendChild(el) }
            return el;
         },
         /** @function
             @desc Sets custom properties ('x' and 'y') on button elements
                to track the cursor position
             @param {element} container Container element
             @param {string} selector Defaults to 'button'
         */
         animateButtons: function(container, selector = 'button') {
            for (const el of container.querySelectorAll(selector)) {
               if (el.getAttribute('movelistener')) continue;
               el.setAttribute('movelistener', true);
               el.addEventListener('mousemove', function(event) {
                  const rect = el.getBoundingClientRect();
                  const x = Math.floor(
                     event.pageX - (rect.left + window.scrollX)
                  );
                  const y = Math.floor(
                     event.pageY - (rect.top + window.scrollY)
                  );
                  el.style.setProperty('--x', x + 'px');
                  el.style.setProperty('--y', y + 'px');
               });
            }
         },
         /** @function
             @desc Appends an additional value to the object's named string
                property
             @param {object} object The object whose property is being extended
             @param {string} key The property name
             @param {string} value The value appended to the named property
         */
         appendValue: function(object, key, value) {
            let existingValue = object[key] || '';
            if (existingValue) existingValue += ' ';
            object[key] = existingValue + value;
         },
         /** @instance
             @desc An instance of {@link Util/HtmlTiny}
         */
         h: new HtmlTiny(),
         /** @function
             @desc Returns true if the string is HTML. Real crude test
             @param {string} s The string being tested
             @returns {boolean}
         */
         isHTML: function(s) {
            if (typeof s != 'string') return false;
            if (s.match(new RegExp('^<'))) return true;
            return false;
         },
         /** @function
             @desc Returns true if the string is HTML of a given class.
                Another crude test
             @param {string} s The string being tested
             @param {string} class The class name to test for
             @returns {boolean}
         */
         isHTMLOfClass: function(s, className) {
            if (typeof s != 'string') return false;
            if (!s.match(new RegExp(`class="${className}"`))) return false;
            return true;
         }
      },
      /** @mixin
          @classdesc Exports methods used to compose classes from roles/traits
          @alias WCom.Util/Modifiers
       */
      Modifiers: {
         /** @function
             @desc Applies the listed traits from the namespace to the supplied
                object. If the trait has an 'initialiser' function it is
                called passing in the 'args'
             @param {object} object Object to which the traits are applied
             @param {object} namespace List of all traits
             @param {array} traits List of trait names to be applied
             @param {object} args Passed to the trait 'initialiser' method
         */
         applyTraits: function(object, namespace, traits, args) {
            for (const trait of traits) {
               if (!namespace[trait]) {
                  throw new Error(namespace + `: Unknown trait ${trait}`);
               }
               const initialiser = namespace[trait]['initialise'];
               if (initialiser) initialiser.bind(object)(args);
               for (const method of Object.keys(namespace[trait].around)) {
                  object.around(method, namespace[trait].around[method], trait);
               }
            }
         },
         /** @function
             @desc The function specified the 'method' on the self referential
                object is wrapper by the modifier creating a call chain
             @param {string} method Name of the method being wrapper
             @param {function} modifier Function that wraps the named method
         */
         around: function(method, modifier, trait) {
            const isBindable = func => func.hasOwnProperty('prototype');
            if (!this[method]) {
               throw new Error(`Around no method: ${trait} ${method}`);
            }
            const original = this[method].bind(this);
            const around = isBindable(modifier)
                  ? modifier.bind(this) : modifier;
            this[method] = function(args1, args2, args3, args4, args5) {
               return around(original, args1, args2, args3, args4, args5);
            };
         },
         /** @function
             @desc Deletes all the entries in the supplied list
             @param {array} methods Array being cleared
         */
         resetModifiers: function(methods) {
            for (const method of Object.keys(methods)) delete methods[method];
         }
      },
      /** @mixin
          @classdesc Exports string related methods
          @alias WCom.Util/String
       */
      String: {
         /** @function
             @desc Capitalises the first letter of each word in the
               suppplied string
             @param {string} s Defaults to the empty string
             @returns {string}
         */
         capitalise: function(s = '') {
            const words = [];
            for (const word of s.split(' ')) words.push(ucfirst(word));
            return words.join(' ');
         },
         /** @function
             @desc Creates a unique identity string
             @returns {string}
         */
         guid: function() {
            // https://jsfiddle.net/briguy37/2MVFd/
            let date = new Date().getTime();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
               const r = ((date + Math.random()) * 16) % 16 | 0;
               date = Math.floor(date / 16);
               return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
            });
         },
         /** @function
             @desc Pads out the supplied string to the given size with the pad
                character filling on the left
             @param {string} s String to be padded
             @param {integer} size Length of the returned string
             @param {character} pad Character used to pad out the string
             @returns {string}
         */
         padString: function(string, padSize, pad) {
            string = string.toString();
            pad = pad.toString() || ' ';
            const size = padSize - string.length;
            if (size < 1) return string;
            return pad.repeat(size) + string;
         },
         /** @function
             @desc Returns the supplied string with the first letter capitalised
             @param {string} s String to be capitalised
             @returns {string}
         */
         ucfirst
      },
      /** @mixin
          @classdesc Exports URL related methods
          @alias WCom.Util/URL
       */
      URL: {
         /** @function
             @desc Creates a URL with argument replacement and query string
                parameters
             @param {string} url Contains '*' for each of the arguments
             @param {array} args Substituted in for each '*' in the URL
             @param {object} query Keys and values for the query string.
                Defaults to empty object
             @param {object} options If options contains 'requestBase' prepend
                this to the returned string. Defaults to empty object
             @returns {string}
         */
         createURL: function(url, args, query = {}, options = {}) {
            for (const arg of args) url = url.replace(/\*/, arg);
            const q = createQueryString(
               Object.entries(query).reduce((acc, [key, val]) => {
                  if (key && (val && val !== '')) acc[key] = val;
                  return acc;
               }, {})
            );
            if (q.length) url += `?${q}`;
            const base = options.requestBase;
            if (!base) return url.replace(/^\//, '');
            return base.replace(/\/+$/, '') + '/' + url.replace(/^\//, '');
         }
      }
   };
})();
