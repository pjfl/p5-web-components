// -*- coding: utf-8; -*-
/** @namespace
    @classdesc Takes navigation away from the browser. Displays context
       sensitive menus. Displays server messages
    @alias WCom/Navigation
*/
WCom.Navigation = (function() {
   const navId  = 'navigation';
   const dsName = 'navigationConfig';
   /** @class
       @classdesc Takes navigation away from the browser
       @alias Navigation/Navigation
   */
   class Navigation {
      /** @constructs
          @desc Append the title to the container and applies
             {@link Navigation/Navigation#popstateHandler popstate}
             and {@link Navigation/Navigation#resizeHandler resize} handlers to
             the window
          @param {element} container The application title and control menu
             are rendered here
          @param {object} config
          @property {string} config.moniker Unique name of the server model
          @property {object} config.menus Initialises the
             {@link Navigation/Menus Menus} object
          @property {object} config.messages Initialises the
             {@link Navigation/Messages Messages} object
          @property {string} config.properties.base-url
          @property {string} config.properties.confirm
          @property {string} config.properties.container-layout
          @property {string} config.properties.container-name
          @property {string} config.properties.content-name
          @property {string} config.properties.content-icon
          @property {string} config.properties.content-title
          @property {string} config.properties.icons
          @property {string} config.properties.link-display
          @property {string} config.properties.location
          @property {string} config.properties.logo
          @property {string} config.properties.media-break
          @property {string} config.properties.skin
          @property {string} config.properties.title
          @property {string} config.properties.title-abbrev
          @property {string} config.properties.verify-token
       */
      constructor(container, config) {
         this.container        = container;
         this.moniker          = config['moniker'];
         this.properties       = config['properties'];
         this.baseColour       = this.properties['base-colour'];
         this.baseURL          = this.properties['base-url'];
         this.confirm          = this.properties['confirm'];
         this.containerLayout  = this.properties['container-layout'];
         this.containerName    = this.properties['container-name'];
         this.contentName      = this.properties['content-name'];
         this.controlIcon      = this.properties['control-icon'];
         this.controlTitle     = this.properties['control-title'];
         this.icons            = this.properties['icons'];
         this.linkDisplay      = this.properties['link-display'];
         this.location         = this.properties['location'];
         this.logo             = this.properties['logo'];
         this.mediaBreak       = this.properties['media-break'];
         this.skin             = this.properties['skin'];
         this.title            = this.properties['title'];
         this.titleAbbrev      = this.properties['title-abbrev'];
         this.token            = this.properties['verify-token'];
         this.contentContainer = document.getElementById(this.containerName);
         this.contentPanel     = document.getElementById(this.contentName);
         this.menu             = new Menus(this, config['menus']);
         this.messages         = new Messages(config['messages']);
         this.titleEntry       = 'Loading';
         container.append(this._renderTitle());
         window.addEventListener('popstate', this.popstateHandler());
         window.addEventListener('resize', this.resizeHandler());
         if (this.baseColour) document.body.setAttribute(
            'style', '--bg-base: ' + this.baseColour
         );
      }
      /** @function
          @desc Attaches 'click' and 'submit' handlers to anchors and forms
             in the container. Handlers are provided by the
             {@link Navigation/Menus Menus} object
          @param {element} container Search this element for anchors and forms
          @param {object} options Passed to the menus 'click' and 'submit'
             handler methods. Defaults to an empty object
      */
      addEventListeners(container, options = {}) {
         const url = this.baseURL;
         for (const link of container.getElementsByTagName('a')) {
            const href = link.href + '';
            if (href.length && url == href.substring(0, url.length)
                && !link.getAttribute('clicklistener')) {
               const handler = this.menu.clickHandler(href, options);
               link.addEventListener('click', handler);
               link.setAttribute('clicklistener', true);
            }
         }
         for (const form of container.getElementsByTagName('form')) {
            const action = form.action + '';
            if (action.length && url == action.substring(0, url.length)
                && !form.getAttribute('submitlistener')) {
               const handler = this.menu.submitHandler(form, options);
               form.addEventListener('submit', handler);
            }
         }
      }
      /** @function
          @desc Returns a bound function which handles the 'popstate' event.
             If the event has a state with an href attribute call
             {@link Navigation/Navigation#renderLocation render location}
             on that
          @returns {function}
      */
      popstateHandler() {
         return function(event) {
            const state = event.state;
            if (state && state.href) this.renderLocation(state.href);
         }.bind(this);
      }
      /** @function
          @async
          @desc Posts a form back to the server. Request a partial render of
             the response
          @param {string} action The URL to post back to
          @param {element} form The form to post
      */
      async process(action, form) {
         const options = { headers: { Prefer: 'render=partial' }, form };
         const { location, reload, text }
               = await this.bitch.blows(action, options);
         if (location) {
            if (reload) { window.location.href = location }
            else {
               this.renderLocation(location);
               this.messages.render(location);
            }
         }
         else if (text) { this.renderHTML(text) }
         else {
            console.warn('Neither content nor redirect in response to post');
         }
      }
      /** @function
          @desc Renders messages and the context sensitive menus.
             Scans the content panel for anchors and forms
      */
      render() {
         this.messages.render(window.location.href);
         this.menu.render();
         this.scan(this.contentPanel);
      }
      /** @function
          @async
          @desc Renders the supplied HTML by replacing the existing panel with
             a new one
          @param {string} html Markup for the content of the new panel
      */
      async renderHTML(html) {
         let className = this.containerName;
         if (this.containerLayout) className += ' ' + this.containerLayout;
         this.contentContainer.setAttribute('class', className);
         const attr = { id: this.contentName, className: this.contentName };
         const panel = this.h.div(attr);
         panel.innerHTML = html;
         await this.scan(panel);
         this.contentPanel = document.getElementById(this.contentName);
         this.contentPanel = this.addReplace(
            this.contentContainer, 'contentPanel', panel
         );
      }
      /** @function
          @async
          @desc Fetch and render the specified location
          @param {string} href The location to fetch and render
      */
      async renderLocation(href) {
         const url = new URL(href);
         url.searchParams.delete('mid');
         const opt = { headers: { prefer: 'render=partial' }, response: 'text'};
         const { location, text } = await this.bitch.sucks(url, opt);
         if (text && text.length > 0) {
            await this.menu.loadMenuData(url);
            await this.renderHTML(text);
            this._setHeadTitle();
            this.menu.render();
         }
         else if (location) {
            this.messages.render(location);
            this._redirectAfterGet(href, location);
         }
         else {
            console.warn('Neither content nor redirect in response to get');
         }
      }
      /** @function
          @desc Returns a bound function which handles the 'resize' event
          @returns {function}
      */
      resizeHandler() {
         return function(event) {
            const linkDisplay = this.linkDisplay;
            const navigation = document.getElementById('navigation');
            const sidebar = document.getElementById('sidebar');
            const main = document.getElementById('main');
            const className = 'nav-link-' + this.linkDisplay;
            navigation.classList.remove(className);
            sidebar.classList.remove(className);
            main.classList.remove(className);
            if (window.innerWidth <= this.mediaBreak) {
               navigation.classList.add('nav-link-icon');
               sidebar.classList.add('nav-link-icon');
               main.classList.add('nav-link-icon');
               this.linkDisplay = 'icon';
            }
            else {
               const original = this.properties['link-display'];
               navigation.classList.add('nav-link-' + original);
               sidebar.classList.add('nav-link-' + original);
               main.classList.add('nav-link-' + original);
               this.linkDisplay = original;
            }
            if (linkDisplay != this.linkDisplay) {
               this.menu.linkDisplay = this.linkDisplay;
               this.menu.render();
            }
         }.bind(this);
      }
      /** @function
          @async
          @desc Scans the panel with the registered onload callbacks then
             adds 'click' and 'submit' handlers
          @param {element} panel The element to scan
          @param {object} options Passed to the onload callbacks and
             'addEventListeners'. Defaults to an empty object
      */
      async scan(panel, options = {}) {
         await WCom.Util.Event.onLoad(panel, options);
         this.addEventListeners(panel, options);
      }
      async _redirectAfterGet(href, location) {
         const locationURL = new URL(location);
         locationURL.searchParams.delete('mid');
         if (locationURL != href) {
            console.log('Redirect after get to ' + location);
            await this.renderLocation(location);
            return;
         }
         const state = history.state;
         console.log('Redirect after get to self ' + location);
         console.log('Current state ' + state.href);
         let count = 0;
         while (href == state.href) {
            history.back();
            if (++count > 3) break;
         }
         console.log('Recovered state ' + count + ' ' + state.href);
      }
      _renderTitle() {
         const title = this.logo.length ? [this.menu.iconImage(this.logo)] : [];
         title.push(this.h.span({ className: 'title-text' }, this.title));
         return this.h.div({ className: 'nav-title' }, title);
      }
      _setHeadTitle() {
         const head = (document.getElementsByTagName('head'))[0];
         const titleElement = head.querySelector('title');
         const entry = this.capitalise(this.titleEntry);
         titleElement.innerHTML = this.titleAbbrev + ' - ' + entry;
      }
   }
   Object.assign(Navigation.prototype, WCom.Util.Bitch);
   Object.assign(Navigation.prototype, WCom.Util.Markup);
   Object.assign(Navigation.prototype, WCom.Util.String);
   /** @class
       @classdesc Loads and renders context sensitive menus
       @alias Navigation/Menus
   */
   class Menus {
      /** @constructs
          @desc Initialises the menu object
          @param {object} navigation An instance of the
             {@link Navigation/Navigation Navigation} object
          @param {object} config Data structure containing the menu definitions
      */
      constructor(navigation, config) {
         this.config        = config;
         this.navigation    = navigation;
         this.container     = navigation.container;
         this.controlIcon   = navigation.controlIcon || 'settings';
         this.controlTitle  = navigation.controlTitle || 'Control';
         this.icons         = navigation.icons;
         this.linkDisplay   = navigation.linkDisplay;
         this.location      = navigation.location;
         this.token         = navigation.token;
         this.contextPanels = {};
         this.headerMenu;
         this.globalMenu;
      }
      /** @function
          @desc Returns a bound function which handles the 'click' event
          @param {string} href
          @param {object} options
          @property {object} options.renderLocation
          @returns {function}
      */
      clickHandler(href, options = {}) {
         return function(event) {
            event.preventDefault();
            if (options.renderLocation) {
               if (options.renderLocation(href, event)) return;
            }
            WCom.Util.Event.onUnload();
            this.navigation.renderLocation(href);
         }.bind(this);
      }
      /** @function
          @desc Returns a bound function which handles dialog confirmation
          @param {string} name
          @returns {function}
      */
      confirmHandler(name) {
         return function(event) {
            if (this.confirm) {
               if (confirm(this.confirm.replace(/\*/, name))) return true;
            }
            else if (confirm()) return true;
            event.preventDefault();
            return false;
         }.bind(this);
      }
      /** @function
          @desc Returns either an image element or an icon element if icons
             are available
          @param {string} icon Either an icon name or a URL for an image
          @returns {element}
      */
      iconImage(icon) {
         if (icon && icon.match(/:/)) return this.h.img({ src: icon });
         else if (icon) {
            const icons = this.icons;
            if (!icons) return this.h.span({ className: 'text' }, '≡');
            return this.h.icon({ className: 'icon', icons, name: icon });
         }
         return icon;
      }
      /** @function
          @async
          @desc Fetches the menu data. Updates this objects 'config' attribute
          @param {string} url
      */
      async loadMenuData(url) {
         const state = { href: url + '' };
         history.pushState(state, 'Unused', url); // API Darwin award
         url.searchParams.set('navigation', true);
         const { object } = await this.bitch.sucks(url);
         if (!object || !object['menus']) return;
         this.config = object['menus'];
         this.token = object['verify-token'];
         this.navigation.containerLayout = object['container-layout'];
         this.navigation.titleEntry = object['title-entry'];
      }
      /** @function
          @desc Render the menus
      */
      render() {
         if (!this.config) return;
         const content = [this._renderControl(), this._renderMobile()];
         if (!this.config['_global']) return;
         const global = this._renderList(this.config['_global'], 'global');
         if (this.location == 'header') content.unshift(global);
         const cMenu = this.h.nav({ className: 'nav-menu' }, content);
         this.headerMenu = this.addReplace(this.container, 'headerMenu', cMenu);
         if (this.location == 'header') return;
         const container = document.getElementById(this.location);
         const gMenu = this.h.nav({ className: 'nav-menu' }, global);
         this.globalMenu = this.addReplace(container, 'globalMenu', gMenu);
      }
      /** @function
          @desc Returns a bound function that handles the 'submit' event
          @param {element} form
          @param {object} options
          @property {function} options.onUnload
          @returns {function}
      */
      submitHandler(form, options = {}) {
         form.setAttribute('submitlistener', true);
         const action = form.action;
         return function(event) {
            event.preventDefault();
            if (options.onUnload) options.onUnload();
            else WCom.Util.Event.onUnload();
            form.setAttribute('submitter', event.submitter.value);
            this.navigation.process(action, form);
         }.bind(this);
      }
      _addSelected(item) {
         item.classList.add('selected');
         return true;
      }
      _isCurrentHref(href) {
         return history.state && history.state.href.split('?')[0]
            == href.split('?')[0] ? true : false;
      }
      _renderControl() {
         if (!this.config['_control']) return;
         const panelAttr = { className: 'nav-panel control-panel' };
         const panel = this._renderList(this.config['_control'], 'control');
         this.contextPanels['control'] = this.h.div(panelAttr, panel);
         const linkAttr = { title: this.controlTitle };
         const link = this.h.a(linkAttr, this._renderControlIcon());
         const attr = { className: 'nav-control' };
         return this.h.div(attr, [link, this.contextPanels['control']]);
      }
      _renderControlIcon() {
         const icons = this.icons;
         if (!icons)
            return this.h.span({ className: 'nav-control-label text' }, '≡');
         const name = this.controlIcon;
         const icon = this.h.icon({
            className: 'settings-icon', height: 24, icons, name, width: 24
         });
         return this.h.span({ className: 'nav-control-label' }, icon);
      }
      _renderItem(item, menuName) {
         const [text, href, icon] = item;
         const iconImage = this.iconImage(icon);
         const title = iconImage && this.linkDisplay == 'icon' ? text : '';
         const itemAttr = { className: menuName, title };
         if (typeof text != 'object') {
            const label = this._renderLabel(icon, text);
            if (href) {
               const onclick = this.clickHandler(href, {});
               const link = this.h.a({ href, onclick }, label);
               link.setAttribute('clicklistener', true);
               return this.h.li(itemAttr, link);
            }
            const labelAttr = { className: 'drop-menu' };
            return this.h.li(itemAttr, this.h.span(labelAttr, label));
         }
         if (!text || text['method'] != 'post') return;
         const verify = this.h.hidden({ name: '_verify', value: this.token });
         const formAttr = { action: href, className: 'inline', method: 'post' };
         const form = this.h.form(formAttr, verify);
         form.addEventListener('submit', this.submitHandler(form, {}));
         const onclick = this.confirmHandler(name);
         const buttonAttr = { className: 'form-button', onclick };
         const label = this.h.span(this._renderLabel(icon, text['name']));
         form.append(this.h.button(buttonAttr, label));
         return this.h.li(itemAttr, form);
      }
      _renderLabel(icon, text) {
         const iconImage = this.iconImage(icon);
         return {
            both: [iconImage, text],
            icon: iconImage ? iconImage : text,
            text: text
         }[this.linkDisplay];
      }
      _renderList(list, menuName) {
         const [title, itemList] = list;
         if (!itemList.length) return this.h.span({ className: 'empty-list' });
         const items = [];
         let context = false;
         let isSelected = false;
         for (const item of itemList) {
            if (typeof item == 'string' && this.config[item]) {
               let className = 'nav-panel';
               if (menuName == 'context' || menuName == 'control')
                  className = 'slide-out';
               const rendered = this._renderList(this.config[item], 'context');
               this.contextPanels[item] = this.h.div({ className }, rendered);
               context = item;
               continue;
            }
            const listItem = this._renderItem(item, menuName);
            if (context) {
               const panel = this.contextPanels[context];
               if (panel.firstChild.classList.contains('selected'))
                  isSelected = this._addSelected(listItem);
               listItem.append(panel);
               context = false;
            }
            if (this._isCurrentHref(item[1]))
               isSelected = this._addSelected(listItem);
            items.push(listItem);
         }
         const navList = this.h.ul({ className: 'nav-list' }, items);
         if (menuName) navList.classList.add(menuName);
         if (isSelected) navList.classList.add('selected');
         return navList;
      }
      _renderMobile() {
         const linkDisplay = this.linkDisplay;
         this.linkDisplay = 'text';
         const control = this._renderList(this.config['_control'], 'mobile');
         const global = this._renderList(this.config['_global'], 'mobile');
         this.linkDisplay = linkDisplay;
         const panelAttr = { className: 'nav-panel mobile-panel' };
         const panel = [control, global];
         this.contextPanels['mobile'] = this.h.div(panelAttr, panel);
         const hamburger = this.h.span('≡');
         const checkboxAttr = { className: 'hamburger', id: 'hamburger' };
         const labelContent = [this.h.checkbox(checkboxAttr), hamburger];
         const labelAttr = { className: 'nav-hamburger', htmlFor: 'hamburger' };
         const label = this.h.label(labelAttr, labelContent);
         const attr = { className: 'nav-mobile' };
         return this.h.div(attr, [label, this.contextPanels['mobile']]);
      }
   }
   Object.assign(Menus.prototype, WCom.Util.Bitch);
   Object.assign(Menus.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Displays server messages
       @alias Navigation/Messages
   */
   class Messages {
      /** @constructs
          @desc Creates and appends 'messages' panel to the document body
          @param {object} options
          @property {integer} options.buffer-limit How many messages to buffer.
             Defaults to 3
          @property {integer} options.display-time How long to display each
             message. Defaults to 20 seconds
          @property {string} options.messages-url Where to fetch the messages
      */
      constructor(options) {
         const attr = { className: 'messages-panel', id: 'messages' };
         this.panel = this.h.div(attr);
         document.body.append(this.panel);
         this.bufferLimit = options['buffer-limit'] || 3;
         this.displayTime = options['display-time'] || 20;
         this.messagesURL = options['messages-url'];
         this.items = [];
      }
      /** @function
          @async
          @desc Fetch and render messages. Extracts the message id (mid) from
             the query string in the supplied URL. Appends this to the
             messages URL provided when this object was constructed. Fetching
             this gets an array of messages from the server. Each of these
             is appended to the 'messages' panel with handlers to make them
             fade and disappear
          @param {string} href Message id is extracted from the query string
      */
      async render(href) {
         const url = new URL(href);
         const mid = url.searchParams.get('mid');
         if (!mid) return;
         const messagesURL = new URL(this.messagesURL);
         messagesURL.searchParams.set('mid', mid);
         const { object } = await this.bitch.sucks(messagesURL);
         if (!object) return;
         for (const message of object) {
            if (!message) continue;
            const item = this.h.div({ className: 'message-item' }, message);
            item.addEventListener('click', function(event) {
               item.classList.add('hide');
            });
            this.panel.appendChild(item);
            this.items.unshift(item);
            this._animate(item);
         }
         while (this.items.length > this.bufferLimit) {
            this.items.pop().remove();
         }
      }
      _animate(item) {
         setTimeout(function() {
            item.classList.add('fade');
         }, 1000 * this.displayTime);
         setTimeout(function() {
            item.classList.add('hide');
         }, 1000 * (this.displayTime + 3));
      }
   }
   Object.assign(Messages.prototype, WCom.Util.Bitch);
   Object.assign(Messages.prototype, WCom.Util.Markup);
   /** @class
       @classdesc Creates the Navigation object on page load. These are the
          public methods exposed by this package
       @alias Navigation/Manager
   */
   class Manager {
      /** @constructs
          @desc Calls
             {@link Navigation/Manager#createNavigation create navigation}
             when the page loads
       */
      constructor() {
         this.navigator;
         WCom.Util.Event.onReady(
            function() { this.createNavigation() }.bind(this)
         );
      }
      /** @function
          @desc Create a new instance of
             {@link Navigation/Navigation Navigation} and then calls it's
             {@link Navigation/Navigation#render render} method. The document
             should contain an element with id 'navigation' that has a JSON
             encoded data attribute 'data-navigation-config'. These are passed
             to the Navigation object's constructor
      */
      createNavigation() {
         const el = document.getElementById(navId);
         if (!el) return;
         this.navigator = new Navigation(el, JSON.parse(el.dataset[dsName]));
         this.navigator.render();
      }
      /** @function
          @desc Calls
             {@link Navigation/Navigation#addEventListeners add event listeners}
             on the {@link Navigation/Navigation Navigation} object
      */
      onContentLoad() {
         if (!this.navigator) return;
         const el = document.getElementById(this.navigator.contentName);
         if (el) this.navigator.addEventListeners(el);
      }
      /** @function
          @desc Fetches and renders the supplied location by calling
             {@link Navigation/Navigation#renderLocation render location}
             on the {@link Navigation/Navigation Navigation} object
          @param {string} href The location to render
      */
      renderLocation(href) {
         if (this.navigator) this.navigator.renderLocation(href);
      }
      /** @function
          @desc Fetches and renders any pending server messages by calling
             {@link Navigation/Messages#render render} on the
             {@link Navigation/Messages messages} object
          @param {string} href Should have a message id in the query string
      */
      renderMessage(href) {
         if (this.navigator) this.navigator.messages.render(href);
      }
      /** @function
          @desc Scans the supplied element. Inflates forms and tables then
             adds 'click' and 'submit' handlers. Calls
             {@link Navigation/Navigation#scan scan} on the
             {@link Navigation/Navigation Navigation} object
          @param {element} el The element to scan for links and forms
          @param {object} options Passed to the 'Navigation' scan method
      */
      scan(el, options) {
         if (el && this.navigator) this.navigator.scan(el, options);
      }
   }
   /** @module Navigation
    */
   return {
      /** @instance
          @desc An instance of class {@link Navigation/Manager}
      */
      manager: new Manager()
   };
})();
