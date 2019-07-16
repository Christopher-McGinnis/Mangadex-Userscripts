/* declare module 'greasemonkey3' {
  export var GM_info: typeof GM.info
  export var GM_setValue: typeof GM.setValue
  export var GM_getValue: typeof GM.getValue
  export var GM_deleteValue: typeof GM.deleteValue
  export var GM_listValues: typeof GM.listValues
  export var GM_getResourceUrl: typeof GM.getResourceUrl
  export var GM_notification: typeof GM.notification
  export var GM_openInTab: typeof GM.openInTab
  export var GM_setClipboard: typeof GM.setClipboard
  export var GM_xmlhttpRequest: typeof GM.xmlHttpRequest
} */
declare namespace GM {
  interface Response<TContext> {
      readonly responseHeaders: string;
      readonly finalUrl: string;
      /** The same object passed into the original request */
      readonly context?: TContext;

      readonly readyState: 1 | 2 | 3 | 4;
      readonly response: any;
      readonly responseText: string;
      readonly responseXML: Document | false;
      readonly status: number;
      readonly statusText: string;
  }
}
declare var GM_info: typeof GM.info
declare var GM_setValue: typeof GM.setValue
declare var GM_getValue: typeof GM.getValue
declare var GM_deleteValue: typeof GM.deleteValue
declare var GM_listValues: typeof GM.listValues
declare var GM_getResourceUrl: typeof GM.getResourceUrl
declare var GM_notification: typeof GM.notification
declare var GM_openInTab: typeof GM.openInTab
declare var GM_setClipboard: typeof GM.setClipboard
declare var GM_xmlhttpRequest: typeof GM.xmlHttpRequest
