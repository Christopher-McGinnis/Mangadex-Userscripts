// ==UserScript==
// @name     Mangadex Settings
// @version  0.0.1
// @description Settings UI builder for Mangadex userscripts. Should be required by other userscripts.
// @grant    unsafeWindow
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM_getValue
// @grant    GM_setValue
// @require  https://cdn.rawgit.com/Christopher-McGinnis/Mangadex-Userscripts/c2f35786a2a72ffbc37a104f5f720e1fb4c41854/common.js
// @match    https://mangadex.org/*
// @author   Christopher McGinnis
// @icon     https://mangadex.org/images/misc/default_brand.png?1
// @license  MIT
// ==/UserScript==
// Note, above metablock is only processed when installed directly
// Done for debugging purposes
"use strict";

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
class SettingsUI {
  // Singlton group
  constructor({
    group_name=throwMissingParam("new SettingsUI","group_name",'"SettingGroupName" || "UserscriptName"')
  }={}) {
    let currentID=new Date().valueOf() + Math.floor(Math.random() * 100000);
    function createID(id_prefix=throwMissingArg('createID(id_prefix)','id_prefix','settings.group_name')) {
      return id_prefix + (currentID++);
    }
    let xp = new XPath();
    let dialog=xp.new('//div[@id="homepage_settings_modal"]/div').with(xp.new().contains('@class','modal-dialog')).getElement();
    let header=xp.new('.//div').with(xp.new().contains('@class','modal-header')).getElement(dialog);
    let mangadex_header_tab_id=createID('mangadex-setting-header-tab-');
    let header_tab_container=htmlToElement(`
      <div class="tab-content h5 align-items-center">
      </div>`);

    // Move current Mangadex settings header into a tab
    let mangadex_header_tab=htmlToElement(`<div class="tab-pane active" role="tabpanel" id="${mangadex_header_tab_id}"></div>`);
    // The h5 elm
    //mangadex_header_tab.appendChild(header.children[0]);
    mangadex_header_tab.appendChild(header.children[0]);
    header_tab_container.appendChild(mangadex_header_tab);
    let header_content=htmlToElement(`<div></div>`);


    let tab_nav_container=htmlToElement(`
      <div class="h5 d-flex align-items-center">
      <span class="fas fa-cog fa-fw " aria-hidden="true"></span>
      <ul class="nav nav-pills" roll="tablist">
        <li class="nav-item active">
          <a data-toggle="tab" role="tab" class="nav-link active show" href="#${mangadex_header_tab_id}">Manga Dex</a>
        </li>
      </ul>
      </div>

    `);
    let tab_nav=tab_nav_container.children[1];
    header_content.appendChild(tab_nav_container);
    //header_content.appendChild(header_tab_container);

    header.insertBefore(header_content,header.children[0]);

    let groupID=createID(group_name + "-");
    header_tab_container.appendChild(htmlToElement(`
      <div class="tab-pane" role="tabpanel" id=${groupID}>
      <h5 class="modal-title">${group_name}</h5>
      </div>
      `));
    tab_nav.appendChild(htmlToElement(`
      <li class="nav-item"><a data-toggle="tab" role="tab"  class="nav-link" href="#${groupID}">${group_name}</a></li>
    `));
    /*$(`#${mangadex_header_tab_id} a`).on('click', function (e) {
      e.preventDefault()
      $(this).tab('show')
    });
    $(`#${groupID} a`).on('click', function (e) {
      e.preventDefault()
      $(this).tab('show')
    });*/

    let mangadex_body = xp.new('.//div').with(xp.new().contains('@class','modal-body')).getElement(dialog);
    function SettingsUIInstance({group_name,container=mangadex_body}) {
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

      function OptionItem({
        key=throwMissingParam("new OptionItem","key",`'a unique key for this select group'`),
        icon,
        title=key,
        title_text,
        value=key,
        onselect = () => {return null;},
        onchange = () => {return null;},
        ondeselect = () => {return null;},
        selected=false
      }) {
        let item = this;
        if (!( item instanceof OptionItem) ) {
            return new OptionItem(...arguments);
        }
        item.key=key;
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
        let enabled=selected;
        Reflect.defineProperty(item,'select_value',{
          get() { return item.elm.value; },
        });
        // Boolean value programmer is interested in.
        // TODO veriffy this works
        Reflect.defineProperty(item,'enabled',{
          get() { return enabled; },
          set(new_value) { item.elm.selected=new_value; return new_value; },
        });
        item.elm.dataset.contents = ui.innerHTML;
        item.elm.select_callback   = (new_value,old_value) => {
          onselect(item,new_value,old_value);
        };
        item.elm.deselect_callback = (new_value,old_value) => {
          ondeselect(item,new_value,old_value);
        };
        item.elm.change_callback = (new_value,old_value) => {
          enabled=new_value;
          onchange(item,new_value,old_value);
        };
        return item;
      };

      function Select({
        key=throwMissingParam("new Select","key",`'a unique key for settings group <${settings.group_name}>'`),
        container=throwMissingParam("new Select","container",`'the container element for <${settings.group_name}>'`),
        title = key,
        title_text,
        multiselect=false,
        onchange = () => {return null;},
        options=[],
      }) {
        let setting = this;
        if (!( setting instanceof Select) ) {
            return new Select(...arguments);
        }
        setting.key=key;
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
        $('#' + id ).on("changed.bs.select",function (e,clickedIndex,newValue,oldValue) {
            // New value is bool. oldValue is... array with random crap... for some reason....
            setting.select.children[clickedIndex].change_callback(newValue,oldValue);
            if (newValue) {
              setting.select.children[clickedIndex].select_callback(newValue,oldValue);
            }
            else {
              setting.select.children[clickedIndex].deselect_callback(newValue,oldValue);
            }
            onchange(e,setting,clickedIndex,newValue,oldValue);
        });
        // Contains OptionItem instances
        setting.options={};
        // Contains OptionItem selected state (getters/setters)
        setting.values={};
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
          Reflect.defineProperty(setting.values, option.key,{
            get() {
              return option.enabled;
            },
            set(val) {
              return option.enabled=val;
            },
          });
          setting.select.appendChild(option.elm);
          last_used_value=option.select_value;
        };
        setting.addOption = (args) => {
          setting.addExistingOption(new OptionItem({value: nextOptionValueToUse(), ...args}));
        };

        for (let [idx,option] of options.entries()) {
          setting.addExistingOption(option);
        }
        return setting;
      };
      settings.subgroup_objects={};
      settings.subgroup={};
      function addSetting(setting) {
        throwOnBadArg(settings.subgroup[setting.key] != null,"Select.addSetting(new Setting)","key",'"UniqueSettingKey"',setting.key);
        settings.subgroup_objects[setting.key]=setting;
        //if (setting.options[option.select_value] != null) {
          //dbg("WARNING! Option value reused within Select! Remoing Existing!");
          //setting.select.removeChild(setting.options[option.select_value]);
        //}
        Reflect.defineProperty(settings.subgroup, setting.key,{
          get() {
            return setting.values;
          },
          // FIXME support non-multiselect
          //set(val) {
          //  return option.enabled=val;
          //},
        });
      }
      settings.addMultiselect = (args) => {
        let setting = new Select({multiselect:true,container:container,...args});
        addSetting(setting);
        return setting;
      };
      settings.addSelect = (args) => {
        let setting = new Select({container:container,...args});
        addSetting(setting);
        return setting;
      };
      return settings;
    }
    // END SelectUIInstance
    if (! SettingsUI.instance ) {
      SettingsUI.instance = this;
      SettingsUI.instance.groups=[];
    }
    if (!SettingsUI.instance.groups[group_name]) {
      SettingsUI.instance.groups[group_name]=new SettingsUIInstance({group_name:group_name});
    }
    let settings = SettingsUI.instance.groups[group_name];
    return settings;
  }

}
function example() {
  let settings_ui = new SettingsUI({group_name:"AdvancedFilter"});
  let block_mulsel = settings_ui.addMultiselect({key:"blocked", title:"Blacklist"});
  for (let [idx,o] of ["adventure", "isekai", "drama","fake genre"].entries()) {
    let item = block_mulsel.addOption({
      title: o,
      key: o, // key will also be the unique genre name. could be anything, but this makes it easier to manualy refer to.
      ontoggle: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("changed!");
      },
      onselect: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("NOW SELECTED!");
      },
      ondeselect: (item,value) => {
        // Do something
        dbg(item);
        dbg(value);
        dbg("NOW NOT SELECTED!");
      }
    });
  }
  // title is optional. Defaults to key value.
  let selectAuto = m.addMultiselect({key:"Autocomplete"});
  selectAuto.addOption({key:"Manga"});
  selectAuto.addOption({key:"Users"});
  let settings = settings_ui.values;
  // Get value from Blacklist every 5 seconds.
  setInterval(() => {
    dbg(settings_ui.values.blocked.adventure);
    dbg(settings.blocked.adventure);
    dbg(block_mulsel.values.adventure);
  },5000);

}
/*
let xp = new XPath();
checkLoop({
  xpath:'//div[@id="homepage_settings_modal"]/div',
  callback:example,
});
*/
