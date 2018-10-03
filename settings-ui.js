// ==UserScript==
// @name     Mangadex Settings
// @version  0.0.1
// @description Settings UI builder for Mangadex userscripts. Should be required by other userscripts.
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @grant    GM_listValues
// @grant    GM_listValues
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/2f84a04d4adf05142fb4c9a727f1dcae4cfbc78c/common.js
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/2f84a04d4adf05142fb4c9a727f1dcae4cfbc78c/uncommon.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// @license  MIT
// ==/UserScript==
// Note, above metablock is only processed when installed directly
// Done for debugging purposes
'use strict';

function createToolTip({title,text}) {
  let tooltip_elm = htmlToElement(`<div>${title}<br><span>${text}</span></div>`);
  let tooltip_text = tooltip_elm.children[1];
  tooltip_elm.style.display="none";
  tooltip_elm.style.backgroundColor="rgba(15,15,15,0.9)";
  tooltip_elm.style.borderRadius="15px";
  tooltip_elm.style.color="rgb(215,215,215)";
  tooltip_elm.style.left="0%";
  tooltip_elm.style.position="absolute";
  tooltip_elm.style.zIndex=10;
  tooltip_elm.style.textAlign="center";
  document.body.appendChild(tooltip_elm);
  return {
    tooltip:tooltip_elm,
    text_container:tooltip_text
  };
}
// WARNING ALL SETTING UIs MUST BE BUILT SHORTLY AFTER THE USERSCRIPT STARTS!
// We are utilizing the site's own bootstrap jquery based select builder..
// We are fighting a race against time to use it.
// Seems to work fine ATM, so long as we build our UI before doing any processing.
// FIXME There should be a way to add things after it runs. If not, we will have
// to do our own menus. I like the current methd mainly because it uses the sites
// own setting menu elements, so there is no excuse for our users not to know how
// to use them.
// FIXME singlton is only single per userscript. Multiple userscripts against
// multiple versions of this can cause problems. need to stabilize the API And
// then attempt to latch onto the newest version.
// if (typeof window.SettingUI !== 'function') {
// TODO Save
// Should be top down. everything saves to the same monolithic object unless
// they specify a diffrent location. save should only save objects in same
// save location, and should save all of them.
// a save all for saving children who specify diffrent locations as wel to their
// independent storage locations.
// Save should be an overridable function, but there should never be a need to
// override it.
// TODO save_location. A simple name for where we save crap. used by the default
// save function.
// TODO autosave: bool. Specifies weather or not we should save after every change
// TODO autosave_delay: A delay between saves, will NOT save until this much time
// has passed. Sequential autosave triggers will reset the delay.
// NOTE until these are implementecd, you must save manualy. recommened
// passing that in onchange callback.

/**
* SettingsUI singlton
* @param {Object} obj -
* @param {string} obj.group_name - Name of new settings group tab.
* @param {string} [obj.save_location] - Optional location to save/load values from. used in calls to GM (get/set)Value
* @returns {SettingsUIInstance} - The UI instance for obj.group_name. Creates new
* instance if one wasn't found.
*/
class SettingsUI {
  // Singlton group
  constructor({
    group_name=throwMissingParam("new SettingsUI","group_name",'"SettingGroupName" || "UserscriptName"'),
    settings_tree_config: settings_ui_st_args,
  }={}) {
    let currentID=new Date().valueOf() + Math.floor(Math.random() * 100000);
    function createID(id_prefix=throwMissingArg('createID(id_prefix)','id_prefix','settings.group_name')) {
      // Ensure standard complient. Must begin with a letter.
      return "SettingsUI-id-" + (id_prefix.toString().replace(/\W/g,'_')) + (currentID++);
    }
    let xp = new XPath();
    /**
    * A builder for Setting tabs.
    * @returns {SettingsTabBuilder} The new tab builder.
    */
    function SettingsTabBuilder() {
      let sgroup = this;
      if (!( sgroup instanceof SettingsTabBuilder) ) {
          return new SettingsTabBuilder(...arguments);
      }
      // Get Mangadex Quick Settings Dialog
      let dialog=xp.new('//div[@id="homepage_settings_modal"]/div').with(xp.new().contains('@class','modal-dialog')).getElement();
      let header=xp.new('.//div').with(xp.new().contains('@class','modal-header')).getElement(dialog);
      let modal_body=xp.new('.//div').with(xp.new().contains('@class','modal-body')).getElement(dialog);
      let modal_content=modal_body.parentNode;

      // Remove mangadex settings header title. We will use our own version of it.
      header.removeChild(header.children[0]);

      // Create new header and tab navigation list
      let header_content=htmlToElement(`<div></div>`);
      let tab_nav_container=htmlToElement(`
        <div class="h5 d-flex align-items-center">
        <span class="fas fa-cog fa-fw " aria-hidden="true"></span>
        <ul class="nav nav-pills" roll="tablist">

        </ul>
        </div>
      `);
      header_content.appendChild(tab_nav_container);
      header.insertBefore(header_content,header.children[0]);
      let tab_nav=tab_nav_container.children[1];

      // Create new body and tab content containers
      let tab_content = htmlToElement(`
        <div class="tab-content">
        </div>
      `);
      modal_content.insertBefore(tab_content,modal_body);

      // Define tab/nav creation methods
      sgroup.appendNavItem = ({title,active=false,id}) => {
        let item=htmlToElement(`
        <li class="nav-item ${active ? "active" : "" }">
          <a data-toggle="tab" role="tab" class="nav-link ${active ? "active show" : "" }" href="#${escape(id)}">${title}</a>
        </li>`);
        tab_nav.appendChild(item);
      };
      sgroup.appendTabItem = ({title,active=false,id}) => {
        let item = htmlToElement(`
         <div class="modal-body tab-pane ${active ? "show active" : "" }" role="tabpanel" id="${id}">
         </div>
        `);
        tab_content.appendChild(item);
        return item;
      };

      // Unified method for creating tab navs and tab containers.
      /**
      * Adds a settings tab group
      * @param {Object} obj -
      * @param {String} obj.title - Name of new settings group tab.
      * @param {Bool} [obj.active=false] - True only if this tab should be activated by default.
      * @param {String} obj.id - unique id, required for bootstrap tabs to function.
      * @returns {Node} The settings tab node (already attatched to DOM). Add some children to it to build your ui.
      */
      sgroup.addGroup = (args) => {
        sgroup.appendNavItem(args);
        let container = sgroup.appendTabItem(args);
        return container;
      };

      // Now that methods are all defined, lets finish initializing.
      // Just need to move Mangadex's settings menu into a tab, so it won't
      // be displayed when we switch to other tabs.
      let mangadex_tab = sgroup.addGroup({title:"Mangadex", active:true, id: createID('mangadex-setting-header-tab-')});
      modal_content.removeChild(modal_body);
      for (let child of modal_body.children) {
        mangadex_tab.appendChild(child);
      }

      //sgroup.tabs=tab_content;
      //sgroup.navs=nav_content;
      return sgroup;
    }

    /**
     @class SettingsUIInstance
     @private
     @type {Object}
     @property {Object} value - Setting value getter/setter chain.
     */
    function SettingsUIInstance({
      group_name,
      container=throwMissingParam("new SettingsUIInstance","container","HTML_Node"),
      settings_tree_config:settings_ui_instance_st_args
    }) {
      let settings = this;
      if (!( settings instanceof SettingsUIInstance) ) {
          return new SettingsUIInstance(...arguments);
      }
      settings.group_name=group_name;
      // Get Mangadex Quick Setting's Container
      let setting_item_id_prefix=settings.group_name + "-item-";
      function createSettingID() {
        return createID(setting_item_id_prefix);
      }


      /**
      @class SettingsTree
      @private
      @type {Object}
      @property {Object} obj -
      @property {Object} obj.value - Getter/Setter for value of all children.
      @property {Object} obj.all_savable - Getter/Setter for value of all children.
      Like obj.value, but builds a new JSON stringifyable object based on the
      current value. Used for saving/loading to/from JSON.
      @property {Object} obj.own_savable - Like obj.all_savable, but doesn't
      descend on children with diffrent save methods.
      */

      /**
      Setting Tree
      @prop {Object} obj -
      @prop {String} obj.key - Key to use for accessing this setting item in its parent's value list.
      @prop {Object} [obj.defer] - Accessor for parent SettingsTree methods. Used to inherit parrent settings when undefined for [save_location,save_method,load_method,autosave,autosave_delay].
      @prop {String} [obj.initial_value] - Initial value, does not trigger onchange/update_ui callbacks. Used by leaf nodes.
      @prop {Function} [obj.onchange] - Callback for when the UI changes the value.
      @prop {Function} [obj.update_ui_callback] - Callback for when the value is changed outside the UI.
      @prop {Boolean} [obj.autosave] - Should changes to this setting's value or it's children's value cause this setting group to save? If undefined, it will defer to its parrent tree, or false if it is a root node.
      @prop {String} [obj.save_location] - A seperate location to save this setting tree and its children.
      @prop {Function} [obj.save_method] - Method used for saving this tree. Called by autosave.
      @prop {Function} [obj.load_method] - Method used for loading this tree.
      */
      function SettingsTree({
        key=throwMissingParam("new SettingsTree","key",`'a unique key to access this SettingsTree from its container'`),
        onchange=()=>{return null;},
        update_ui_callback=()=>{return null;},
        defer,
        autosave,
        autosave_delay,
        initial_value,
        save_location,
        save_method,
        load_method,
        is_leaf=false,
      }) {
        let stree = this;
        if (!( stree instanceof SettingsTree) ) {
          // Your getting an instance wether you like it or not!
          return new SettingsTree(...arguments);
        }
        // Expose tvariables we should be capable of directly altering later
        //stree.key=key;
        stree.autosave=autosave;
        stree.autosave_delay=autosave_delay;

        function defaultLoadMethod() {
          // FIXME: Autoload has a few small issues.
          // 1) we may autosave on load. shouldn't be a big deal, but deffinitly not ideal.
          // 2) we use stree.values, which can load over other save_locations if
          // a child moved save locations. this could cause loaded values from children
          // to be overwritten with old values from before structure change,
          // and then sequentialy be saved. This IS an issue.
          // For the time being, we are safe as long as we only use one save location,
          // or there are no parent save locations.
          if (save_location === 'string' && save_location.length > 0) {
            return getUserValue(save_location,stree.own_savable).then((obj) => {
              stree.value = obj;
              return stree.value;
            });
          }
          else {
            dbg(`WARNING! Attempted to load SettingsTree<${key}>, but no save_location was set!`);
          }
          // FIXME Should we call onchange here? The user initiated this load, so its
          // possible for them to handle this on their own
          // plus we return a promise they can use as a oneoff onchange event.
        }
        function defaultSaveMethod() {
          if (save_location === 'string' && save_location.length > 0) {
            return setUserValue(save_location,stree.own_savable);
          }
          else {
            dbg(`WARNING! Attempted to save SettingsTree<${key}>, but no save_location was set!`);
          }
        }
        // Allow the child to utilize some of our functions/values when unspecified.
        let our_methods = {};
        let private_object = {
          children:{},
          autosave_timeout:undefined,
          save_method:save_method,
          load_method:load_method,
        };
        function getOrDefer(undefered_object, defer_key, default_value) {
          if (typeof undefered_object[defer_key] !== "undefined" && typeof undefered_object[defer_key] !== "null") {
            return undefered_object[defer_key];
          }
          else if (typeof defer === "object") {
            return defer[defer_key];
          }
          return default_value;
        }
        function getStorageMethod(storage_method_key, default_method) {
          // first try using a defined save method.
          if (typeof private_object[storage_method_key] === 'function') {
            return private_object[storage_method_key];
          }
          // Use the default save method on us if we save to a new location.
          else if (typeof save_location !== 'null' && typeof save_location !== 'undefined') {
            return default_method;
          }
          // If we are a child, defer to our parent node
          else if (typeof defer === "object") {
            return defer[storage_method_key];
          }
          // We are a root node without a defined save method nor location.
          // There is no function we can/should return.
          // We wont log this as an error here, instead we do that when we try to call it.
          return default_method;
        }
        Object.defineProperties(our_methods,{
          autosave: {
            get() {
              return getOrDefer(stree, 'autosave', false);
            },
            set(val) {
              stree.autosave=val;
            },
          },
          autosave_delay: {
            get() {
              return getOrDefer(stree, 'autosave_delay', 500);
            },
            set(val) {
              stree.autosave_delay=val;
            },
          },
          autosave_timeout: {
            get() {
              // We use the timeout of whoever ownes the save method.
              if (typeof private_object.save_method === 'function') {
                return private_object.autosave_timeout;
              }
              else if (typeof defer === 'object') {
                return defer.autosave_timeout;
              }
              // There is no save method. One will be generated in this root
              // context, so return ours.
              return private_object.autosave_timeout;
            },
            set(val) {
              // We use the timeout of whoever ownes the save method.
              if (typeof private_object.save_method === 'function') {
                return private_object.autosave_timeout=val;
              }
              else if (typeof defer === 'object') {
                return defer.autosave_timeout=val;
              }
              // There is no save method. One will be generated in this root
              // context, so use ours.
              return private_object.autosave_timeout=val;
            },
          },
          save_method: {
            get() {
              return getStorageMethod('save_method', defaultSaveMethod);
            },
            set(val) {
              private_object.save_method=val;
            },
          },
          load_method: {
            get() {
              return getStorageMethod('load_method', defaultLoadMethod);
            },
            set(val) {
              private_object.load_method=val;
            },
          },
        });
        // FIXME: Ugly patch to permit detecting same save method.
        stree.is_same_method = (parent_method,key) => {
          return parent_method === our_methods[key];
        };

        function autosave_method() {
          if (our_methods.autosave) {
            clearTimeout(our_methods.autosave_timeout);
            if (typeof our_methods.save_method === "function") {
              our_methods.autosave_timeout = setTimeout(() => { our_methods.save_method(); }, our_methods.autosave_delay );
            }
          }
        }
        // FIXME: Dont expose. instead, we should present this data the same way we present UI's accessors.
        stree._get_method_tree = (method_name) => {
          let methods=new Set([]);
          if (typeof our_methods[method_name] === "function") {
            methods.add(our_methods[method_name]);
          }
          for (let [key,child] of Object.entries(private_object.children)) {
            child._get_method_tree().forEach( (decendent_method) => {
              methods.add(decendent_method);
            });
          }
          return methods;
        };
        stree.save = () => {
          if (typeof our_methods.save_method === "function") {
            return our_methods.save_method();
          }
          dbg(`No save method found for ${key}`);
        };
        stree.load = () => {
          if (typeof our_methods.load_method === "function") {
            //dbg(`Loading ${key}`);
            return our_methods.load_method();
          }
          dbg(`No load method found for ${key}`);
        };
        stree.save_all = () => {
          let methods = stree._get_method_tree('save_method');
          //dbg(`Found a total of ${save_methods.size} save methods`);
          methods.forEach( (decendent_method) => {
            decendent_method();
          });
        };
        stree.load_all = () => {
          let methods = stree._get_method_tree('load_method');
          //dbg(`Found a total of ${save_methods.size} save methods`);
          methods.forEach( (decendent_method) => {
            decendent_method();
          });
        };

        // Private value
        let value;
        if (!is_leaf) {
          value = {};
        }
        else if (typeof initial_value !== 'undefined') {
          value=initial_value;
        }
        // avoid duplicating code
        function set_value_common(accessors, obj, allow_autosave=true) {
          if (is_leaf) {
            value = obj;
          }
          else {
            for (let key of Reflect.ownKeys(obj)) {
              // TODO: Optionaly permit setting non-existant keys.
              // Could be used to auto-build settings ui
              // Or could be used for private/non-ui keys
              if (typeof private_object.children[key] === 'object') {
                accessors[key]=obj[key];
              }
            }
          }
          if (allow_autosave) {
            autosave_method();
          }
        }
        // FIXME block adding new keys to value
        Object.defineProperties(stree, {
          children: {
            get() {
              // return a copy of children, so we dont accidently try to assign new children..
              let locked_children={};
              Object.assign(locked_children,private_object.children);
              Object.freeze(locked_children);
              return locked_children;
            },
          },
          key: {
            get() {
              return key;
            },
          },
          value: {
            get() {
              return value;
            },
            set(val) {
              set_value_common(stree.value, val);
              update_ui_callback(val);
              return value;
            },
            enumerable: true,
          },
          // all savables, even ones that save in a diffrent location
          all_savable: {
            get() {
              if (is_leaf) {
                return value;
              }
              let obj = {};
              for (let [key,child] of Object.entries(private_object.children)) {
                obj[key]=child.all_savable;
              }
              return obj;
            },
            // TODO Throw error on attempt to set to savable
          },
          // a savable with only keys set to be stored in the same save_location
          own_savable: {
            get() {
              if (is_leaf) {
                return value;
              }
              let obj = {};
              for (let [key,child] of Object.entries(private_object.children)) {
                // FIXME ugly patch to detect same save methods
                dbg(`Got key <${key}> with SettingsTree` );
                dbg (child);
                if (child.is_same_method(our_methods.save_method, 'save_method')) {
                  obj[key]=child.own_savable;
                }
              }
              return obj;
            },
            // TODO Throw error on attempt to set to savable
          },
          // NOTE quick access method for all_savable.
          // can't justify adding it.
          // Too ambiguous.
          /*savable: {
            get() { return stree.all_savable; },
          },*/
        });
        // Similar to this.value, but for the UI.
        // Not added to settings tree, passed directly to ui for privacy.
        let ui_accessor={
          children_accessors:{},
        };
        Object.defineProperties(ui_accessor,{
          value: {
            get() {
              if (is_leaf) {
                return value;
              }
              else {
                return ui_accessor.children_accessors;
              }
            },
            set(val) {
              set_value_common(ui_accessor.children_accessors,val);
              onchange(val);
              return value;
            },
          }
        });
        stree.update_ui_callback=update_ui_callback;
        if (!is_leaf) {
          stree.createBranch = (args) => {
            let [childTree, child_ui_accessor] = new SettingsTree({
              defer:our_methods,
              ...args,
            });
            private_object.children[childTree.key] = childTree;
            let desc = Reflect.getOwnPropertyDescriptor(childTree,'value');
            Object.defineProperty(stree.value,childTree.key,desc);
            let ui_desc = Reflect.getOwnPropertyDescriptor(child_ui_accessor,'value');
            Object.defineProperty(ui_accessor.value,childTree.key,ui_desc);
            return [childTree, child_ui_accessor];
          };
          stree.createLeaf = (args) => {
            let [childTree, child_ui_accessor] = new SettingsTree({
              // Defaults
              defer:our_methods,
              ...args,
              // Overrides
              is_leaf:true,
            });
            private_object.children[childTree.key] = childTree;
            let desc = Reflect.getOwnPropertyDescriptor(childTree,'value');
            Object.defineProperty(stree.value,childTree.key,desc);
            let ui_desc = Reflect.getOwnPropertyDescriptor(child_ui_accessor,'value');
            Object.defineProperty(ui_accessor.value,childTree.key,ui_desc);
            return [childTree, child_ui_accessor];
          };
        }
        Object.seal(stree);
        Object.seal(ui_accessor);
        return [stree,ui_accessor];
      }


      function OptionItem({
        key=throwMissingParam("new OptionItem","key",`'a unique key for this select group'`),
        icon,
        title=key,
        title_text,
        value=key,
        settings_tree_config: st_args,
        onselect = () => {return null;},
        ondeselect = () => {return null;},
        parrent_settings_tree,
        select_id,
        selected=false
      }) {
        let item = this;
        if (!( item instanceof OptionItem) ) {
            return new OptionItem(...arguments);
        }
        item.key=key;
        let [settings_tree,ui_accessor] = parrent_settings_tree.createLeaf({
          key:key,
          initial_value:false,
          ...st_args,
          update_ui_callback: (new_value) => {
            item.elm.selected=new_value;
            // update select picker text
            $('#' + select_id ).selectpicker('refresh');
            return new_value;
          },
        });
        item.settings_tree=settings_tree;

        // TODO: Potentialy load settings here.
        let ui = htmlToElement(`
          <li class="${selected ? "selected" : ""}">
          ${icon ? `<img class="" src="${icon}"/>` : "" }
          <span class="">${title}</span>
          </li>
        `);
        item.elm=htmlToElement(`
          <option  ${selected ? "selected" : "" } value="${value}"/>${title}</option>
        `);
        // The value in select, usualy a unique index related to the items position in select.
        // Does NOT normaly change
        Object.defineProperties(item,{
          'select_value': {
            get() { return item.elm.value; },
          },
        });

        item.elm.dataset.contents = ui.innerHTML;
        item.elm.dataset.option_key = key;

        // callbacks not handled by settings tree
        item.select_callback   = (new_value,old_value) => {
          onselect(item,new_value,old_value);
        };
        item.deselect_callback = (new_value,old_value) => {
          ondeselect(item,new_value,old_value);
        };
        item.change_callback = (new_value,old_value) => {
          ui_accessor.value=new_value;
        };
        return item;
      };

      function Select({
        key=throwMissingParam("new Select","key",`'a unique key for settings group <${settings.group_name}>'`),
        container=throwMissingParam("new Select","container",`'the container element for <${settings.group_name}>'`),
        title = key,
        title_text,
        settings_tree_config: st_args,
        multiselect=false,
        parrent_settings_tree=throwMissingParam("new Select","parrent_settings_tree",`Container's SettingsTree instance`),
        options=[],
      }) {
        let setting = this;
        if (!( setting instanceof Select) ) {
            return new Select(...arguments);
        }
        setting.key=key;
        let [settings_tree,ui_accessor] = parrent_settings_tree.createBranch({
          key:key,
          ...st_args,
        });
        setting.settings_tree=settings_tree;

        setting.elm = htmlToElement(`<div class="form-group row">
    			<label class="col-lg-3 col-form-label-modal">${title}:</label>
    			<div class="col-lg-9">
              <select ${ multiselect ? "multiple" : ""} class="form-control selectpicker show-tick" data-actions-box="true" data-selected-text-format="count > 5" data-size="10" title="${title}">
              </select>
          </div>
        </div>`);
        setting.label=setting.elm.children[0];
        setting.select=setting.elm.children[1].children[0];
        let id=createSettingID();
        setting.id=id;
        setting.select.id=id;
        container.appendChild(setting.elm);
        //
        $('#' + id ).on("changed.bs.select",function (e,clickedIndex,newValue,oldValue) {
          /*dbg("CHANGE");
          dbg(e);
          dbg("idx");
          dbg(clickedIndex);
          dbg("new");
          dbg(newValue);
          dbg("old");
          dbg(oldValue);
          */
          // New value is bool related to the changed option . oldValue is array of previously selected options 'value' attribute
          if (typeof clickedIndex === "number") {
            //setting.select.children[clickedIndex].change_callback(newValue,oldValue);
            let option_key=setting.select.children[clickedIndex].dataset.option_key;
            ui_accessor.value[option_key]=newValue;
            //setting.options[option_key].change_callback(newValue);
            if (newValue) {
              setting.options[option_key].select_callback(newValue,oldValue);
            }
            else {
              setting.options[option_key].deselect_callback(newValue,oldValue);
            }
            //onchange(e,setting,clickedIndex,newValue,oldValue);
            //ui_accessor.value
          }
          else {
            let n = Object.values(setting.select.selectedOptions).map( (o) => {
              return o.dataset.option_key;
            } );
            /*let o = Object.values(oldValue).map( (o) => {
              dbg(o);
              return setting.select.children[o].dataset.option_key;
            } );*/
            let o = oldValue;
            // find diffrences between selected indexes
            n.filter( (k) => {
              return o.indexOf(k) < 0;
            }).concat(o.filter( (k) => {
              return n.indexOf(k) < 0;
            })).forEach((changed_key) => {
              // and then set them to their boolean value.
              ui_accessor.value[changed_key] = n.indexOf(changed_key) >= 0;
            });
          }
          dbg(setting.select);
        });
        // Contains OptionItem instances
        setting.options={};
        // Contains OptionItem selected state (getters/setters)

        let last_used_value = -1;
        function nextOptionValueToUse() {
          return ++last_used_value;
        }
        setting.addExistingOption = (option) => {
          throwOnBadArg(setting.options[option.key] != null,"Select.addExistingOption(new Option())","key", `a unique key for select group <${setting.key}>`,option.key);
          //if (setting.options[option.select_value] != null) {
            //dbg("WARNING! Option value reused within Select! Remoing Existing!");
            //setting.select.removeChild(setting.options[option.select_value]);
          //}
          setting.options[option.key] = option;
          setting.select.appendChild(option.elm);
          last_used_value=option.select_value;
        };

        /**
        * Adds an option to a select.
        * @param {Object} obj -
        * @param {String} obj.key - Key to use to access this from value list
        * @param {String} [obj.icon] - Displayed opyion title to use in UI.
        * @param {String} [obj.title=obj.key] - Displayed opyion title to use in UI.
        * @param {String} [obj.value=obj.key] - Value to use in the select node.
        * @param {Function} [obj.onselect] - Callback to call when option is selected.
        * @param {Function} [obj.ondeselect] - Callback to call when option is deselected.
        * @param {Function} [obj.onchange] - Callback to call when option select state is changed.
        * @returns {Node} The settings tab node (already attatched to DOM). Add some children to it to build your ui.
        */
        setting.addOption = (args) => {
          setting.addExistingOption(new OptionItem({
            //value: nextOptionValueToUse(),
            //value: args.key,
            select_id:id,
            parrent_settings_tree:settings_tree,
            ...args
          }));
        };

        for (let [idx,option] of options.entries()) {
          setting.addExistingOption(option);
        }
        return setting;
      };
      settings.subgroup_objects={};
      settings.subgroup={};
      let [settings_tree] = new SettingsTree({
        key:group_name,
        ...settings_ui_instance_st_args,
      });

      settings.value=settings_tree.value;
      function addSetting(setting) {
        throwOnBadArg(settings.subgroup[setting.key] != null,"Select.addSetting(new Setting)","key",'"UniqueSettingKey"',setting.key);
        settings.subgroup_objects[setting.key]=setting;
        //if (setting.options[option.select_value] != null) {
          //dbg("WARNING! Option value reused within Select! Remoing Existing!");
          //setting.select.removeChild(setting.options[option.select_value]);
        //}
      }

      settings.addMultiselect = (args) => {
        let setting = new Select({
          multiselect:true,
          container:container,
          parrent_settings_tree:settings_tree,
          ...args
        });
        addSetting(setting);
        return setting;
      };

      /**
      * Adds an option to a select.
      * @param {Object} obj -
      * @param {String} [obj.key] - Key to use to access this from value list
      * @param {Bool} [obj.multiselect=false] - True if multiple options may be selected at the same time.
      * @param {String} [obj.title=obj.key] - text to use for label in the UI.
      * @param {Function} [obj.onchange] - Callback to call when select state is changed. ie. when any option is selected/deselected.
      * @returns {Select} Select setting instance.
      */
      settings.addSelect = (args) => {
        let setting = new Select({
          container:container,
          parrent_settings_tree:settings_tree,
          ...args
        });
        addSetting(setting);
        return setting;
      };
      settings.settings_tree=settings_tree;
      return settings;
    }
    // END SelectUIInstance
    // Actual constructor below
    if (! SettingsUI.instance ) {
      SettingsUI.instance = this;
      SettingsUI.instance.groups=[];
      SettingsUI.tab_builder = new SettingsTabBuilder();
    }
    // Create the group if it doesnt exist
    if (!SettingsUI.instance.groups[group_name]) {
      let group_id=createID(group_name + '-tab-');
      let container = SettingsUI.tab_builder.addGroup({title:group_name, id:group_id});
      SettingsUI.instance.groups[group_name]=new SettingsUIInstance({
        group_name:group_name,
        container:container,
        settings_tree_config:settings_ui_st_args,
      });
    }
    // Return the requested group instance.
    let settings = SettingsUI.instance.groups[group_name];
    return settings;
  }
}

// Simple usage example. Also used for testing functionality.
function example() {
  // Create a new setting tab with the label <Advanced Filter>.
  let settings_ui = new SettingsUI({
    group_name:"Advanced Filter",
    settings_tree_config: { save_location:"FilterSettings" },
  });
  // Create a new multiselect with the label <NSFW tags>, accessible from the settings tree via the key <nsfw_tags>.
  let select_nsfw = settings_ui.addMultiselect({key:"nsfw_tags", title:"NSFW tags"});
  // Add an option labeled <Echi> to the multiselect. Accessible from the settings tree via the <echi> key.
  select_nsfw.addOption({title: "Echi", key:"echi", settings_tree_config: { autosave:true }, });
  // title is optional. Defaults to key value.
  // Add an option labeled <Smut> to the multiselect. Accessible from the settings tree via the <Smut> key.
  select_nsfw.addOption({
    key:"Smut",
    settings_tree_config: { save_location:"SmutIsSpecial", }, // NOTE, autosave is off
  });
  // Optional callbacks for select, deselct, and toggle.
  select_nsfw.addOption({
    key:"NSFW",
    settings_tree_config: {
      onchange: (item,value) => {
        dbg(`Doing something everytime NSFW value changes.`);
        dbg(`In this case, printg the new value <${value}> on the console`);
      },
    },
    onselect: (item,value) => { dbg('We could also listen to only select events'); },
    ondeselect: (item,value) => { dbg('We could also listen to only deselect events'); },
  });
  // Create another multiselect
  let block_mulsel = settings_ui.addMultiselect({key:"blocked", title:"Blacklist", autosave:true});
  // Create a bunch of options with the same callbacks.
  for (let [idx,name] of ["yaoi", "sports", "mecha","no chapters"].entries()) {
    let item = block_mulsel.addOption({
      title: name,
      key: name,
      settings_tree_config: {
        onchange: (value) => {
          // Do something
          dbg(`Changed <${name}> to <${value}>`);
          dbg(value);
        },
      },
      onselect: (item,value) => {
        // Do something
        dbg(`Selected <${name}>`);
        dbg(value);
      },
      ondeselect: (item,value) => {
        // Do something
        dbg(`Deselected <${name}>`);
        dbg(value);
      }
    });
  }
  // Great! Now everything was just built into our settings tree.
  // Now we just need a refrence to the value getter, which is stored in our
  // setting tree
  let settings = settings_ui.settings_tree.value;
  // settings now refers to our settings getter. You can now access or change
  // the current state by changing the relavent key in settings.

  // Check if yaoi is blocked.
  dbg('Check if yaoi is blocked');
  dbg(settings_ui.settings_tree.all_savable);
  dbg(settings.blocked.yaoi);
  // Change value from outside ui. UI will update to reflect the new value.
  // Block yaoi.
  dbg('Blocked yaoi. Checking new value');
  settings.blocked.yaoi=true;
  dbg(settings.blocked.yaoi);

  // Get value from Blacklist every 5 seconds.
  // Prove that all our easy methods for accessing/setting state stay in sync with the ui.
  // Try changing the value from the ui and see what we print.

  // Export settings_ui for playing with in the console.
  settings_ui.list_all_values = () => {
    return new Promise((r,e) => {
      let gm_values = GM_listValues();
      let length =  gm_values.length;
      for (let v of Object.values(gm_values)) {
      	console.log(`${v} = ${GM_getValue(v,undefined)}`);  //+ ' = ' +  GM_getValue(arry[p]) );
      }
    });
  };
  setInterval(() => {
    // these should all print the same thing
    dbg(settings_ui.settings_tree.value.blocked.yaoi);
    // note value is a refrence to settings_tree.value
    //dbg(settings_ui.value.blocked.yaoi);
    dbg(settings.blocked.yaoi);
    dbg(block_mulsel.settings_tree.value.yaoi);
    settings_ui.list_all_values();
    //dbg(block_mulsel.value.yaoi);
  },5000);

  // NOTE:
  // SettingsTree.value reutrns getters/setters tree.
  // Refrences can be made to any non-leaf node without becoming detatched from
  // the SettingsTree.
  // These of these are bound to the SettingsTree
  let st_a = settings_ui.settings_tree.value.blocked;
  let st_b = settings.blocked;
  let st_c = st_b;

  // Leaf nodes return actual value, not accessors. So refrences to them will
  // not be bound to the setting tree.
  // In our example, All of these would be leaf nodes.
  // As such, assignments to the new leaf_* variables will not affect the SettingsTree.
  let leaf_a = settings_ui.settings_tree.value.blocked.sports;
  let leaf_b = settings.blocked.sports;
  let leaf_c = st_b.sports;
  // This is only usefull for caching the value of the leaf to ensure that changes to it
  // do not affect an operation. If you don't need to cache the value
  // I recomend to always refrence the leaf through the parent tree.
  // This will help avoid




  // settings_tree.value is a tree of getters/setters.
  // If we want a snapshot of the current value, we need to use
  // settings_tree.all_savable instead.
  // savable is usefull for encoding an entire tree or subtree to JSON, or
  // printing a tree to screen.
  // As a demo, first lets look at what value gives you on a tree
  dbg("settings_tree.value is nothing but getters/setters");
  dbg(settings_ui.settings_tree.value);
  // Next lets print the savable.
  dbg("settings_tree.all_savable accesses value, calling the getters and yielding a snapshot of the current value.");
  dbg(settings_ui.settings_tree.all_savable);
  dbg("all_savable returns a snapshot of all children, regardless of their save method.");
  dbg(select_nsfw.settings_tree.all_savable);
  dbg("own_savable returns a snapshot containing only children with the same save method.");
  dbg(select_nsfw.settings_tree.own_savable);
  // You can also assign to value. If you assigning an object to value
  // we will descend the object and setting tree by the shared key, when we
  // encounter a leaf node, we will assign it the object/value that shares its
  // key instead of descending. Any keys in object that do not have a
  // corasponging setting tree value will be skipped.
  settings_ui.value={blocked:{sports:true}};

  // Since savable is a snapshot, getting the value and then asigning to the
  // keys of the result will not affect the ui or setting tree.
  // DO NOT TRY THIS
  dbg('Savable getter returns a snapshot. Assignments to the snapshot can NOT be used to change the settings_tree value');
  // DO NOT TRY THIS.
  let savable=settings_ui.settings_tree.all_savable;
  // DO NOT TRY THIS. Sports will not update on the UI nor settings tree. Replaces with value instead
  savable.blocked.sports=true;
  // DO NOT TRY THIS. Sports will not update on the UI nor settings tree. Replaces with value instead
  savable={blocked:{sports:true}};
  dbg('blocked.sports was not updated in settings tree, because assignment occured on a snapshot object, completly detatched from the settings tree.');
  dbg(settings_ui.settings_tree.all_savable)
  // TL;DR settings_tree.value returns getters/setters attatched to the tree.
  // savable returns an object with a snapshot of the value, but completly detatched from the tree.

  unsafeWindow.settings_ui = settings_ui;
}

/*
let xp = new XPath();
waitForElementByXpath({
  xpath:'//div[@id="homepage_settings_modal"]/div',
}).then(example);
*/
