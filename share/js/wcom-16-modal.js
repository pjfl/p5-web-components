// -*- coding: utf-8; -*-
/** @namespace
    @classdesc Displays modal dialogues
    @alias WCom/Modal
*/
WCom.Modal = (function() {
   const eventUtil = WCom.Util.Event;
   const navManager = WCom.Navigation.manager;
   const keyCodes = { enter: 13, escape: 27 };
   const modalList = (() => {
      let modals = [];
      return {
         add(id) {
            if (modals.indexOf(id) === -1) modals.push(id);
         },
         isTopModal(id) {
            return modals[modals.length - 1] === id;
         },
         remove(id) {
            modals = modals.filter(m => m !== id);
         }
      }
   })();
   /** @class
       @classdesc Displays a background mask for the dialogue
       @alias Modal/Backdrop
   */
   class Backdrop {
      /** @constructs
          @desc Creates the 'popupContainer' and appends it to the
             'popupBackground' which it also creates
          @param {object} options Defaults to an empty object
          @property {boolean} options.noMask Defaults false. If true the class
             'mask' is added to the 'popupBackground'
          @property {integer} options.zIndex Applied to 'popupBackground'
             style
       */
      constructor(options = {}) {
         const noMask = options.noMask || false;
         const zIndex = options.zIndex || null;
         this.popupContainer = this.h.div({
            id: 'modal-container', className: 'modal-container out'
         });
         this.popupBackground = this.h.div({
            className: 'modal-outer-wrapper',
            id: 'modal-outer-wrapper',
            style: zIndex ? `z-index: ${zIndex}` : ''
         }, this.popupContainer);
         if (noMask) this.popupBackground.classList.remove('mask');
         else this.popupBackground.classList.add('mask');
      }
      /** @function
          @desc Appends the supplied element to the 'popupContainer'. Appends
             the 'popupBackground' to the document body
          @param {element} el Element to be appended
       */
      add(el) {
         this.popupContainer.appendChild(el);
         document.body.appendChild(this.popupBackground);
         this.popupContainer.classList.add('in');
         this.popupContainer.classList.remove('out');
      }
      /** @function
          @desc Removes the supplied element from the 'popupContainer'. Removes
             the 'popupBackground' from the document
          @param {element} el Element to be removed
       */
      remove(el) {
         if (!el) return;
         const elParent = el.parentNode;
         elParent.classList.add('out');
         elParent.classList.remove('in');
         const popupParent = this.popupBackground.parentNode;
         if (popupParent) popupParent.removeChild(this.popupBackground);
      }
   }
   Object.assign(Backdrop.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Creates buttons for the modal dialogue
       @alias Modal/Button
   */
   class Button {
      /** @constructs
          @desc Creates buttons
          @param {object} options Defaults to an empty object
          @property {object} options.data Data attribute for the element
          @property {string} options.id Id of the created element
          @property {array} options.modifiers List of classes added to the
             element
          @property {function} options.onclick Handler for the click event
          @property {string} options.parent If specified the created button/link
             is appended to this
          @property {string} options.text Button/link text to display
          @property {string} options.title Title text for the button element
          @property {string} options.type Either 'button' or 'a'
          @property {string} options.url The 'href' for the anchor created
      */
      constructor(options = {}) {
         const isButton = !options.url;
         const type = isButton ? 'button' : 'a';
         let classes = 'button';
         if (options.modifiers) {
            classes += options.modifiers.map(m => ` button-${m}`).join('');
         }
         const attrs = { className: classes };
         ['id', 'onclick', 'title', 'type'].forEach((a) => {
            if (options[a]) attrs[a] = options[a];
         });
         if (options.data) {
            for (const a of Object.keys(options.data))
               attrs[`data-${a}`] = options.data[a];
         }
         if (!isButton) attrs.href = options.url;
         this.text = document.createTextNode(options.text || '');
         this.elm = this.h[type](attrs, this.h.span([this.text]));
         if (options.parent) options.parent.appendChild(this.elm);
      }
      /** @function
          @desc Adds 'button-active' to the buttons class list
       */
      activate() {
         this.elm.classList.add('button-active');
      }
      /** @function
          @desc Removes 'button-active' from the buttons class list
       */
      deactivate() {
         this.elm.classList.remove('button-active');
      }
      /** @function
          @desc Sets the button to disabled
       */
      disable() {
         this.elm.disabled = true;
      }
      /** @function
          @desc Returns the button element
          @returns {element}
       */
      element() {
         return this.elm;
      }
      /** @function
          @desc Sets the button to enabled
       */
      enable() {
         this.elm.disabled = false;
      }
      /** @function
          @desc Update the button text
          @param {string} text New button text
       */
      updateText(text) {
         this.text.nodeValue = text;
      }
   }
   Object.assign(Button.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Drag and drop handling for the dialogue
       @alias Modal/Drag
   */
   class Drag {
      /** @constructs
          @desc Creates a new drag object
          @param {object} options
          @property {string} options.scrollWrapper Class used to to select
             the element that the 'scroll' event handler is attached to.
             Defaults to '.main'
      */
      constructor(options) {
         this.drag = {};
         this.dragNodeX = null;
         this.dragNodeY = null;
         const scrollWrapper = options.scrollWrapper || '.main';
         this.scrollWrapper = document.querySelector(scrollWrapper);
      }
      /** @function
          @desc Start the drag
          @param {event} event
          @param {object} options
          @property {boolean} options.autoScroll
          @property {integer} options.autoScrollSpeed
          @property {integer} options.autoScrollStep
          @property {object} options.constraints
          @property {element} options.dragNode
          @property {object} options.dragNodeOffset
          @property {function} options.dropCallback
          @property {object} options.dropTargets
          @property {integer} options.fixLeft
          @property {function} options.hoverCallback
          @property {string} options.hoverClass
          @property {function} options.moveCallback
          @property {boolean} options.offsetDragNode
          @property {boolean} options.positionAbsolute
       */
      start(event, options = {}) {
         if (!event) throw new Error('Event not specified');
         event.preventDefault();
         this._stopDrag();
         const autoScroll = options.autoScroll === true
               ? 80 : options.autoScroll || false;
         this.drag = {
            autoScroll,
            autoScrollSpeed: options.autoScrollSpeed || 10,
            autoScrollStep: options.autoScrollStep || 5,
            constraints: options.constraints,
            currentDropNode: null,
            documentHeight: this.h.getDimensions(document).height,
            dragNode: options.dragNode,
            dragNodeOffset: options.dragNodeOffset,
            dropCallback: options.dropCallback,
            dropNodes: options.dropTargets || {},
            fixLeft: options.fixLeft,
            hoverCallback: options.hoverCallback,
            hoverClass: options.hoverClass,
            moveCallback: options.moveCallback,
            positionAbsolute: options.positionAbsolute || false,
            viewportHeight: this.h.getDimensions(window).height
         };
         const { drag, scrollWrapper } = this;
         if (options.offsetDragNode) {
            const position = this.h.getOffset(event.target);
            drag.dragNodeOffset = {
               x: event.pageX - position.left,
               y: event.pageY - position.top,
            };
         }
         if (drag.dragNode) drag.dragNode.style.position = 'absolute';
         this._addHandlers(scrollWrapper);
         this._updateDropNodePositions();
         this._dragHandler(event);
      }
      /** @function
          @desc Returns the drag object
          @returns {object}
       */
      state() {
         return this.drag;
      }
      _addHandlers(wrapper) {
         if (wrapper.getAttribute('scrolllistener')) return;
         wrapper.setAttribute('scrolllistener', 'scrolllistener');
         this.boundScrollHandler = this._scrollHandler.bind(this);
         wrapper.addEventListener('scroll', this.boundScrollHandler);
         this.boundDragHandler = this._dragHandler.bind(this);
         document.addEventListener('mousemove', this.boundDragHandler);
         this.boundDropHandler = this._dropHandler.bind(this);
         document.addEventListener('mouseup', this.boundDropHandler);
         this.boundWheelHandler = this._wheelHandler.bind(this);
         document.addEventListener('wheel', this.boundWheelHandler);
      }
      _autoScrollHandler(event) {
         const { drag } = this;
         const threshold = drag.autoScroll;
         if (!threshold || threshold < 1) return;
         const y = event.pageY;
         const body = document.body;
         const minY = body.scrollTop;
         const maxY = minY + drag.viewportHeight;
         let scrollDirection = 'noScroll';
         if (y + threshold > maxY) scrollDirection = 'down';
         if (y - threshold < minY) scrollDirection = 'up';
         if (drag.scrollDirection !== scrollDirection) {
            drag.scrollDirection = scrollDirection;
            this._setScrollInterval();
         }
      }
      _clearScrollInterval() {
         if (this.drag.scrollInterval) clearInterval(this.drag.scrollInterval);
      }
      _dragHandler(event, options = {}) {
         const { drag } = this;
         if (drag.autoScroll) this._autoScrollHandler(event);
         if (drag.moveCallback) drag.moveCallback(event, drag.dragNode);
         if (drag.updateDropNodePositions) this._updateDropNodePositions();
         const offsetX = drag.dragNodeOffset ? drag.dragNodeOffset.x : 0;
         const offsetY = drag.dragNodeOffset ? drag.dragNodeOffset.y : 0;
         this.dragNodeX = event.pageX;
         this.dragNodeY = event.pageY;
         if (drag.fixLeft) this.dragNodeX = drag.fixLeft;
         const { constraints } = drag;
         if (constraints) {
            const { height, width } = this.dragNode
                  ? this.h.getDimension(this.dragNode)
                  : { height: 0, width: 0 };
            if (constraints.top) {
               const top = constraints.top + offsetY;
               this.dragNodeY = Math.max(this.dragNodeY, top);
            }
            if (constraints.left) {
               const left = constraints.left + offsetX;
               this.dragNodeX = Math.max(this.dragNodeX, left);
            }
            if (constraints.bottom) {
               const bottom = this.dragNodeY - offsetY + height + constraints.bottom;
               this.dragNodeY = Math.min(this.dragNodeY, bottom);
            }
            if (constraints.right) {
               const right = this.dragNodeX - offsetX + width + constraints.right;
               this.dragNodeX = Math.min(this.dragNodeX, right);
            }
         }
         this._updateHoveredNode(event);
         if (drag.dragNodeOffset) {
            this.dragNodeX -= offsetX;
            this.dragNodeY -= offsetY;
         }
         if (drag.dragNode) {
            drag.dragNode.style.left = this.dragNodeX + 'px';
            drag.dragNode.style.top = this.dragNodeY + 'px';
         }
      }
      _dropHandler(event) {
         const { drag } = this;
         if (drag.currentDropNode)
            this._leaveHandler(event, drag.currentDropNode);
         if (drag.dropCallback)
            drag.dropCallback(drag.currentDropNode, drag.dragNode);
         this._stopDrag();
      }
      _hoverHandler(event, node) {
         const { drag } = this;
         if (drag.hoverClass) node.classList.add(drag.hoverClass);
         if (drag.hoverCallback) drag.hoverCallback(node, drag.dragNode, true);
      }
      _leaveHandler(event, node) {
         const { drag } = this;
         if (drag.hoverClass) node.classList.remove(drag.hoverClass);
         if (drag.hoverCallback) drag.hoverCallback(node, drag.dragNode, false);
      }
      _removeHandlers() {
         const wrapper = this.scrollWrapper;
         if (!wrapper.getAttribute('scrolllistener')) return;
         document.removeEventListener('wheel', this.boundWheelHandler);
         document.removeEventListener('mouseup', this.boundDropHandler);
         document.removeEventListener('mousemove', this.boundDragHandler);
         wrapper.removeEventListener('scroll', this.boundScrollHandler);
         wrapper.removeAttribute('scrolllistener');
      }
      _scrollHandler(event) {
         this._updateDropNodePositions();
         this._updateHoveredNode(event);
      }
      _setScrollInterval() {
         this._clearScrollInterval();
         const { drag } = this;
         if (drag.scrollDirection === 'noScroll') return;
         const scrollByValue = drag.scrollDirection === 'down'
               ? drag.autoScrollStep : -drag.autoScrollStep;
         drag.scrollInterval = setInterval(function() {
            this.scrollWrapper.scrollBy(0, scrollByValue);
         }.bind(this), drag.autoScrollSpeed);
      }
      _stopDrag() {
         this._removeHandlers();
         this._clearScrollInterval();
         const { drag } = this;
         if (drag.dragNode && !drag.positionAbsolute) {
            drag.dragNode.style.left = null;
            drag.dragNode.style.position = null;
            drag.dragNode.style.top = null;
         }
         this.drag = {};
      }
      _updateDropNodePositions() {
         const { drag } = this;
         drag.dropNodePositions = [];
         drag.dropNodes.forEach(function(node) {
            const offsets = this.h.getOffset(node);
            const dimensions = this.h.getDimensions(node);
            drag.dropNodePositions.push({
               bottom: offsets.top + dimensions.height,
               left: offsets.left,
               node: node,
               right: offsets.left + dimensions.width,
               top: offsets.top
            });
         }.bind(this));
         drag.updateDropNodePositions = false;
      }
      _updateHoveredNode(event) {
         let hoveredNode = null;
         const { drag, dragNodeX, dragNodeY } = this;
         drag.dropNodePositions ||= [];
         for (const target of drag.dropNodePositions) {
            if (dragNodeX > target.left
                && dragNodeX < target.right
                && dragNodeY > target.top
                && dragNodeY < target.bottom
                && target.node[0] != drag.dragNode[0]) {
               hoveredNode = target;
               break;
            }
         }
         if (hoveredNode != drag.currentDropNode) {
            if (drag.currentDropNode)
               this._leaveHandler(event, drag.currentDropNode);
            if (hoveredNode) this._hoverHandler(event, hoveredNode);
            drag.currentDropNode = hoveredNode;
         }
      }
      _wheelHandler(event) {
         this.scrollWrapper.scrollBy(0, Math.floor(event.deltaY / 7));
      }
   }
   Object.assign(Drag.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Implements the modal dialogues
       @alias Modal/Modal
   */
   class Modal {
      /** @constructs
          @desc Creates a new modal object
          @param {string} title
          @param {element} content
          @param {array} buttons
          @param {object} options
          @property {object} options.backdrop
          @property {string} options.buttonClass
          @property {array} options.classList
          @property {function} options.closeCallback
          @property {object} options.dragConstraints
          @property {string} options.dragScrollWrapper
          @property {function} options.dropCallback
          @property {string} options.icons
          @property {string} options.id
          @property {boolean} options.positionAbsolute
          @property {element} options.resizeElement
          @property {integer} options.unloadIndex
      */
      constructor(title, content, buttons, options) {
         this.title = title;
         this.content = content;
         this.buttons = buttons;
         this.backdropAttr = options.backdrop || {};
         this.buttonClass = options.buttonClass;
         this.classList = options.classList || false;
         this.closeCallback = options.closeCallback;
         this.dragConstraints = options.dragConstraints;
         this.dragScrollWrapper = options.dragScrollWrapper;
         this.dropCallback = options.dropCallback;
         this.icons = options.icons;
         this.id = options.id || 'modal';
         this.positionAbsolute = options.positionAbsolute || false;
         this.resizeElement = options.resizeElement;
         this.unloadIndex = options.unloadIndex;
         this.ident = this.guid();
         this.open = true;
         modalList.add(this.ident);
         this.keyHandler = this._keyHandler.bind(this);
         window.addEventListener('keydown', this.keyHandler);
      }
      /** @function
          @desc Closes the open modal dialogue
       */
      close() {
         if (!this.open) return;
         this.open = false;
         modalList.remove(this.ident);
         window.removeEventListener('keydown', this.keyHandler);
         this.backdrop.remove(this.el);
         this.backdrop = null;
         if (this.closeCallback) this.closeCallback();
         if (this.unloadIndex) eventUtil.unregisterOnunload(this.unloadIndex);
      }
      /** @function
          @desc Returns the elements bounding client rect. No really
          @returns {object}
       */
      position() {
         return this.el.getBoundingClientRect();
      }
      /** @function
          @desc Render the modal dialogue
       */
      render() {
         const classes = this.classList || '';
         const modalAttr = { className: 'modal ' + classes, id: this.id };
         this.el = this.h.div(modalAttr);
         this.modalHeader = this.h.div({
            className: 'modal-header', onmousedown: this._mouseHandler(this.el)
         }, [
            this.h.h1({ className: 'modal-title' }, this.title),
            this._createCloseIcon()
         ]);
         this.modalHeader.setAttribute('draggable', 'draggable');
         this.el.appendChild(this.modalHeader);
         const contentWrapper = this.h.div({
            className: 'modal-content-wrapper'
         }, this.h.div({ className: 'modal-content' }, this.content));
         this.el.appendChild(contentWrapper);
         if (this.buttons.length) this._renderButtons(this.el);
         this.backdrop = new Backdrop(this.backdropAttr);
         this.backdrop.add(this.el);
         if (this.positionAbsolute && this.positionAbsolute.x) {
            this.el.style.position = 'absolute';
            this.el.style.left = this.positionAbsolute.x + 'px';
            this.el.style.top = this.positionAbsolute.y + 'px';
         }
      }
      _buttonHandler(buttonConfig) {
         if (buttonConfig.onclick(this) !== false) this.close();
      }
      _createCloseIcon() {
         const attr = {
            className: 'button-icon modal-close',
            onclick: function(event) {
               event.preventDefault();
               this.close();
            }.bind(this)
         };
         const icons = this.icons;
         if (!icons) return this.h.span(attr, 'X');
         return this.h.span(attr, this.h.icon({
            className: 'close-icon', icons, name: 'close'
         }));
      }
      _keyHandler(event) {
         const { keyCode } = event;
         if (!modalList.isTopModal(this.ident)) return;
         const btn = this.buttons.find(b => b.key && keyCodes[b.key] === keyCode);
         if (btn) this._buttonHandler(btn);
         else if (keyCode === keyCodes['escape']) this.close();
      }
      _mouseHandler(el) {
         return function(event) {
            if (event.target.tagName === 'BUTTON') return;
            if (event.target.tagName === 'SPAN') return;
            const { left, top } = this.modalHeader.getBoundingClientRect();
            const { scrollTop } = document.documentElement || document.body;
            const drag = new Drag({ scrollWrapper: this.dragScrollWrapper });
            drag.start(event, {
               constraints: this.dragConstraints,
               dragNode: el,
               dragNodeOffset: {
                  x: event.clientX - left,
                  y: (event.clientY + scrollTop) - top
               },
               dropCallback: this.dropCallback,
               dropTargets: [],
               positionAbsolute: this.positionAbsolute
            });
         }.bind(this);
      }
      _renderButtons(el) {
         this.buttonBox = this.h.div({ className: 'modal-footer' });
         if (this.resizeElement) {
            const resizeSouth = this.h.div({ className: 'resize-south' });
            const resizeSE = this.h.div({ className: 'resize-south-east' });
            this.buttonBox.appendChild(resizeSouth);
            this.buttonBox.appendChild(resizeSE);
            new Resizer(resizeSouth, this.resizeElement, el, { v: true });
            new Resizer(
               resizeSE, this.resizeElement, el,
               { h: true, v: true }, { w: 320 }
            );
         }
         this.buttons.forEach((button, i) => {
            const modifiers = [];
            if (this.buttons.length >= 2 && !button.greyButton && !i)
               modifiers.push(this.buttonClass || 'primary');
            const onclick = () => this._buttonHandler(button);
            const buttonEl = new Button({
               modifiers, onclick, parent: this.buttonBox, text: button.label
            }).element();
            buttonEl.buttonConfig = button;
         });
         this.animateButtons(this.buttonBox);
         el.appendChild(this.buttonBox);
      }
   }
   Object.assign(Modal.prototype, WCom.Util.Markup);
   Object.assign(Modal.prototype, WCom.Util.String);
   /** @class
       @classdesc A utility object created to facilitate modal creation
       @alias Modal/ModalUtil
   */
   class ModalUtil {
      /** @constructs
          @desc Creates a modal utility object
          @param {object} options
          @property {function} options.callback
          @property {function} options.cancelCallback
          @property {string} options.formClass
          @property {string} options.icons
          @property {string} options.initValue
          @property {array} options.labels
          @property {boolean} options.noButtons
          @property {function} options.onload
          @property {string} options.url
          @property {function} options.validateForm
          @property {object} options.valueStore
      */
      constructor(options) {
         this.callback = options.callback || function() {};
         this.cancelCallback = options.cancelCallback;
         this.formClass = options.formClass || 'classic';
         this.icons = options.icons;
         this.initValue = options.initValue;
         this.labels = options.labels || ['Cancel', 'OK'];
         this.noButtons = options.noButtons || false;
         this.onload = options.onload
            || function(c, o) { navManager.scan(c, o) };
         this.url = options.url;
         this.validateForm = options.validateForm;
         this.valueStore = options.valueStore || {};
      }
      /** @function
          @desc Creates a container for the dialogue content and fetches the
             content from the server
          @returns {element}
       */
      createModalContainer() {
         const spinner = this._createSpinner();
         const loader = this.h.div({ className: 'modal-loader' }, spinner);
         this.frame = this.h.div({
            className: 'selector',
            id: 'selector-frame',
            style: 'visibility:hidden;'
         });
         this.selector = new Selector(this.frame);
         const container = this.h.div({
            className: 'modal-frame-container'
         }, [loader, this.frame]);
         const onload = function() {
            loader.style.display = 'none';
            const selector = this.selector;
            if (this.initValue)
               selector.setModalValue(this.initValue, this.valueStore);
            for (const anchor of this.frame.querySelectorAll('a')) {
               anchor.addEventListener('click', function(event) {
                  this.valueStore = selector.setValueStore(this.valueStore);
                  this.initValue = this.valueStore.value;
               }.bind(this));
            }
            this.frame.style.visibility = 'visible';
         }.bind(this);
         this.scanOptions = {
            formClass: this.formClass,
            renderLocation: function(href, event) {
               const target = event.target;
               const tagName = target.tagName;
               const node = tagName == 'SPAN' ? target.parentNode : target;
               if (node.classList.contains('pageload')) return false;
               this._loadFrameContent(href);
               return true;
            }.bind(this)
         };
         this._loadFrameContent(this.url, onload);
         return container;
      }
      /** @function
          @desc Returns an array of button definitions
          @returns {array}
       */
      getButtons() {
         if (this.noButtons) return [];
         return [{
            label: this.labels[0],
            onclick: function(modalObj) {
               try {
                  this.callback(false, modalObj, this.getModalValue(false));
               }
               catch(e) {}
               if (this.cancelCallback) return this.cancelCallback();
               return true;
            }.bind(this)
         }, {
            label: this.labels[1],
            onclick: function(modalObj) {
               const modalValue = this.getModalValue(true);
               if (this.validateForm
                   && !this.validateForm(modalObj, modalValue))
                  return false;
               return this.callback(true, modalObj, modalValue);
            }.bind(this)
         }];
      }
      /** @function
          @desc Returns the selectors value
          @param {boolean} success Passed to the selectors get modal
             value method
          @returns {object}
       */
      getModalValue(success) {
         return this.selector.getModalValue(success);
      }
      _createSpinner(modifierClass = '') {
         const icon = this.h.icon({
            name: 'spinner',
            className: 'loading-icon',
            icons: this.icons,
            height: '40px',
            width: '40px'
         });
         return this.h.span({
            className: `loading ${modifierClass}`
         }, this.h.span({ className: 'loading-spinner' }, icon));
      }
      async _loadFrameContent(url, onload) {
         const opt = { headers: { prefer: 'render=partial' }, response: 'text'};
         const { location, text } = await this.bitch.sucks(url, opt);
         if (text && text.length > 0) this.frame.innerHTML = text;
         else if (location) {
            // TODO: Deal with
            console.warn('Redirect in response to modal loadFrameContent');
         }
         else {
            console.warn('Neither content nor redirect in response to get');
         }
         if (onload) onload();
         if (this.onload) this.onload(this.frame, this.scanOptions);
      }
   }
   Object.assign(ModalUtil.prototype, WCom.Util.Bitch);
   Object.assign(ModalUtil.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Handlers to resize the dialogue
       @alias Modal/Resizer
   */
   class Resizer {
      /** @constructs
          @desc Creates a resize object
          @param {element} el
          @param {element} resizeEl
          @param {array} alsoResize
          @param {object} dir
      */
      constructor(el, resizeEl, alsoResize, dir) {
         el.addEventListener('mousedown', function(event) {
            this._startDrag(event, resizeEl, alsoResize, dir.h, dir.v)
         }.bind(this));
         this.drag = {};
      }
      _dragHandler(event) {
         event.preventDefault();
         const { drag } = this;
         if (drag.h) {
            const width = Math.max(0, drag.width + event.pageX - drag.x);
            drag.resizeEl.style.width = width + 'px';
         }
         if (drag.v) {
            const height = Math.max(0, drag.height + event.pageY - drag.y);
            drag.resizeEl.style.height = height + 'px';
         }
         if (drag.alsoResize) {
            drag.alsoResize.each(function() {
               if (this != drag.resizeEl[0]) {
                  if (drag.h) this.style.width = width + 'px';
                  if (drag.v) this.style.height = height + 'px';
               }
            });
         }
      }
      _startDrag(event, resizeEl, alsoResize, h, v) {
         event.preventDefault();
         const style = {
            height: '100px', position: 'absolute',
            width: window.getComputedStyle(resizeEl).width
         };
         const shim = this.h.div({ style: style });
         shim.insertBefore(event.target);
         const dimensions = this.h.getDimensions(resizeEl);
         this.drag = {
            alsoResize: alsoResize, h: h, height: dimensions.height,
            resizeEl: resizeEl, shim: shim, v: v, width: dimensions.width,
            x: event.pageX, y: event.pageY
         }
         document.addEventListener('mousemove', this._dragHandler.bind(this));
         document.addEventListener('mouseup', function(event) {
            if (this.drag.shim) {
               this.drag.shim.remove();
               delete this.drag.shim;
            }
            document.removeEventListener('mousemove', this._dragHandler);
         }.bind(this));
      }
   }
   Object.assign(Resizer.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Selects values from the dialogue which are returned to
          the calling page
       @alias Modal/Selector
   */
   class Selector {
      /** @constructs
          @desc Creates a selector object
          @param {element} frame
      */
      constructor(frame) {
         this.frame = frame;
         this.tableClass = 'state-table';
         this.displayAttribute = 'object_display';
      }
      /** @function
          @desc Returns the modal value
          @param {boolean} success
          @returns {object}
       */
      getModalValue(success) {
         if (!success) return null;
         const els = this._selectionEls();
         const selected = [];
         const values = [];
         for (const el of els) {
            if (el.checked) selected.push(el);
            values.push(el.value);
         }
         if (this.type == 'checkbox') {
            this.valueStore = {
               display: null,
               value: this._removeUnchecked(this._addIDs(selected), els)
            };
         }
         else if (this.type == 'radio') {
            if (selected && selected.length > 0) {
               this.valueStore = {
                  display: selected[0].getAttribute(this.displayAttribute),
                  value: selected[0].value
               };
            }
            if (this.valueStore && this.valueStore.value !== undefined) {
               const tempHash = {};
               tempHash[this.valueStore.value] = 1;
               this.valueStore = {
                  display: this.valueStore.display,
                  value: this._removeUnchecked(tempHash, els)
               };
            }
            else this.valueStore = null;
         }
         else if (this.type == 'text') {
            this.valueStore = { display: null, value: values };
         }
         else if (this.type == 'file') {
            this.valueStore = { display: null, files: els[0].files };
         }
         return this.valueStore;
      }
      /** @function
          @desc Sets the modal value
          @param {string} value
          @param {object} valueHash
       */
      setModalValue(value, valueHash) {
         if (!value) return;
         this.valueStore = valueHash;
         const values = value.split(',');
         let el;
         if (this.type === 'radio') {
            for (const selected of this._selectionEls()) {
               if (selected.value == value) {
                  el = selected;
                  break;
               }
            }
         }
         else {
            for (const selected of this._selectionEls()) {
               if (values.includes(selected.value)) {
                  el = selected;
                  break;
               }
            }
         }
         if (!el) return;
         el.setAttribute('checked', false);
         el.click();
      }
      /** @function
          @desc Set the current value store
          @param {object} valueStore
       */
      setValueStore(valueStore) {
         this.valueStore = valueStore;
         return this.getModalValue(true);
      }
      _addIDs(selected) {
         const values = this.valueStore && this.valueStore.value
               ? this.valueStore.value.split(',') : [];
         const newValues = [];
         if (selected && selected.length > 0) {
            for (const el of selected) newValues.push(el.value);
         }
         const valueHash = {};
         if (values.length || newValues.length) {
            for (const v of [...values, ...newValues]) valueHash[v] = v;
         }
         return valueHash;
      }
      _removeUnchecked(values, els) {
         if (values.length === 0) return '';
         for (const el of els) {
            if (values[el.value] && !el.checked) delete values[el.value];
         }
         return Object.keys(values).join(',');
      }
      _selectionEls() {
         let pattern = 'input[type=';
         const table = this.frame.querySelector('.' + this.tableClass);
         if (table) pattern = '.' + this.tableClass + ' ' + pattern;
         const selector = this.frame.querySelectorAll.bind(this.frame);
         if (this.type !== undefined) {
            return selector(pattern + this.type + ']');
         }
         let els = selector(pattern + 'radio]');
         if (els && els.length > 0) {
            this.type = 'radio';
            return els;
         }
         els = selector(pattern + 'checkbox]');
         if (els && els.length > 0) {
            this.type = 'checkbox';
            return els;
         }
         els = selector(pattern + 'text]');
         if (els && els.length > 0) {
            this.type = 'text';
            return els;
         }
         els = selector(pattern + 'file]');
         if (els && els.length > 0) {
            this.type = 'file';
            return els;
         }
         throw new Error(
            'Selectors need either a radio, checkbox, text, or file input'
         );
      }
   }
   const create = function(args) {
      let modal;
      const close = function(event) { if (modal) modal.close() };
      const unloadIndex = eventUtil.registerOnunload(close);
      const util = new ModalUtil(args);
      const content = util.createModalContainer();
      const buttons = util.getButtons();
      const options = { ...args, icons: util.icons, unloadIndex };
      modal = new Modal(args.title, content, buttons, options);
      modal.render();
      return modal;
   };
   /** @module Modal
    */
   return {
      /** @function
          @desc Creates a modal dialogue and calls it's
             {@link Modal/Modal#render render} method. Uses
             an instance of {@link Modal/ModalUtil ModalUtil} to create a
             container and some buttons
          @param {object} options Passed to both Modal and ModalUtil constructors
          @property {string} options.title The dialogue title
          @returns {object} An instance of {@link Modal/Modal Modal}
       */
      create,
      /** @function
          @desc Creates and renders a modal dialogue alert
          @param {object} options
          @property {function} options.callback Called when the Okay button is
             clicked
          @property {string} options.classList Passed to the modal constructor
          @property {string} options.icon Defaults to 'info'. Popup alert class
             applied to the modal content container
          @property {string} options.label Defaults to 'Okay'. Button text
          @property {string} options.text Defaults to ''. Text to display
          @property {string} options.title Passed to the modal constructor
          @returns {object} An instance of {@link Modal/Modal Modal}
       */
      createAlert: function(args) {
         const {
            callback = () => {},
            classList,
            icon = 'info',
            label = 'Okay',
            text = '',
            title
         } = args;
         const content = document.createElement('div');
         content.classList.add(`popup-alert-${icon}`);
         content.appendChild(document.createTextNode(text));
         const buttons = [{ label, onclick: callback }];
         const options = { animate: 'jump', fadeSpeed: 200, classList };
         const modal = new Modal(title, content, buttons, options);
         modal.render();
         return modal;
      },
      /** @function
          @desc Creates a modal dialogue selector
          @param {object} options
          @property {string} options.icons URL of the icons SVG
             containing symbols
          @property {string} options.onchange Evaluated when the selector value
             changes
          @property {string} options.target The selector updates this elements
             value
          @property {string} options.title Defaults to 'Select Item'
          @property {string} options.url URL of the selector content
          @returns {object} An instance of {@link Modal/Modal Modal}
       */
      createSelector: function(args) {
         const { icons, onchange, target, title = 'Select Item', url } = args;
         const callback = function(ok, modal, result) {
            if (!ok || !target) return;
            const el = document.getElementById(target);
            if (!el) return;
            if (result.value) {
               const newValue = result.value.replace(/!/g, '/');
               if (onchange && el.value != newValue)
                  eval(onchange.replace(/%value/g, result.value));
               el.value = newValue;
            }
            else if (result.files && result.files[0]) {
               if (onchange) eval(onchange.replace(/%value/g, 'result.files'));
               el.value = result.files;
            }
            if (el.focus) el.focus();
         }.bind(this);
         return create({ callback, icons, title, url });
      }
   };
})();
