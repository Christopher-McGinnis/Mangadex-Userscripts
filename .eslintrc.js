module.exports = {
  'extends': [
    // Order matters. Later rules override former
    'plugin:@typescript-eslint/recommended'
    ,'airbnb-base'
  ]
  ,'parser': '@typescript-eslint/parser'
  ,'plugins': ['@typescript-eslint']
  ,'parserOptions': {
    project: './tsconfig.json'
    ,tsconfigRootDir: './'
    ,ecmaVersion: 2018
    ,sourceType: 'script'
    ,ecmaFeatures: { impliedStrict: false }
  }
  ,'rules': {
    // Javascript
    'strict': ['error' ,'global']
    // Var is disabled, and inner functions are fine in es6+
    ,'no-inner-declarations': ['off']
    ,'radix': ['error' ,'as-needed']
    ,'max-len': [1 ,100 ,2 ,{ comments: 200 }]
    ,'brace-style': ['error' ,'stroustrup']
    /* FIXME
      Allow:
        something(useful)
        andnot[
          confusing
        ]
        ;[and] = more
        {
          ;[
            indefinitly
          ] = more
        }
      Dissallow:
        Something
        (much)
        more
        [confusing]
        {
          [and] = potentially_error_prone
        }
    */
    // Typescript does this for us
    ,'semi': 'off'
    ,'@typescript-eslint/semi': ['error' ,'never']
    ,'semi-style': ['error' ,'first']
    ,'comma-style': [
      'error'
      ,'first'
      ,{
        exceptions: {
          VariableDeclaration: false
          ,ArrayExpression: false
          ,ArrayPattern: false
          ,ObjectExpression: false
          ,ObjectPattern: false
          ,CallExpression: false
          ,FunctionDeclaration: false
          ,FunctionExpression: false
          ,NewExpression: false
          ,ArrowFunctionExpression: false
          ,ImportDeclaration: false
        }
      }
    ]
    ,'comma-spacing': [
      'error'
      ,{
        before: true
        ,after: false
      }
    ]
    ,'comma-dangle': ['error' ,'never']
    ,'object-curly-newline': [
      'error'
      ,{
        ObjectExpression: {
          multiline: true
          ,minProperties: 2
        }
        ,ObjectPattern: { multiline: true }
      }
    ]
    /* FIXME: elements should be required to either all be on the bracket line,
       or all one seperate lines.
       ALLOW:
       [1,2,3]
      [
        1,
        2,
        3,
      ]
      DISSALOW:
      [
        1,2,3
      ]
      [1
      ,2
      ,3]
    */
    ,'quote-props': ['error' ,'consistent-as-needed' ,{ keywords: true }]
    ,'func-names': ['error' ,'as-needed']
    ,'no-restricted-syntax': ['off' ,'ForOfStatement']
    ,'no-plusplus': ['off']
    ,'array-bracket-newline': [
      'error'
      ,{
        multiline: true
        ,minItems: null
      }
    ]
    ,'array-element-newline': ['error' ,{ multiline: true }]
    /*
     Typescript Override. Disables some rules defined above
    */
    ,'@typescript-eslint/no-non-null-assertion': ['warn']
    // Time to face it. This is JavaScript.
    // camelCase is builtin. You don't have to like it, but you do have to use it.
    ,'camelcase': ['off']
    ,'@typescript-eslint/camelcase': ['warn']
    ,"indent": "off"
    ,'@typescript-eslint/indent': ['error' ,2]
    ,'@typescript-eslint/explicit-function-return-type': [
      'warn'
      ,{
      // if true, only functions which are part of a declaration will be checked
      // FIXME: Make better interfaces or something for promise/forEach/etc, and then turn this back on
      // I shouldn't need to specify the return value of the callback, since it is unused.
      // forEach(callbackfn: ()=> ThisValueDoesntMatterSoStopMakingMeSpecifyIt)
        allowExpressions: true
        // if true, type annotations are also allowed on the variable of a function expression rather than on the function directly
        ,allowTypedFunctionExpressions: true
        // if true, functions immediately returning another function expression will not be checked
        ,allowHigherOrderFunctions: false
      }
    ]
    ,'no-unused-vars': 'off'
    ,'@typescript-eslint/no-unused-vars': [
      'error'
      ,{
        vars: 'all'
        ,args: 'all'
      // "ignoreRestSiblings": false
      }
    ]
    ,'@typescript-eslint/member-delimiter-style': ['error',{
      "multiline": {
        "delimiter": "none",
        "requireLast": false
      },
      "singleline": {
          "delimiter": "comma",
          "requireLast": false
      }
    }]
    ,'@typescript-eslint/explicit-member-accessibility': ['off']
  }
  ,'env': {
    browser: true
    ,node: false
    ,greasemonkey: true
  }
}
