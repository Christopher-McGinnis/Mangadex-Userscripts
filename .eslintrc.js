module.exports = {
    "extends": "airbnb-base",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "script",
        "ecmaFeatures": {
            "impliedStrict": false,
        },
    },
    "rules": {
      "strict": ["error", "global"],
      "max-len": [1,100,2,{comments: 200}],
      "brace-style": ["error", "stroustrup"],
      "semi": ["error", "never"],
      "comma-style": ["error", "first"],
      "comma-dangle": ["error", "never"],
      "func-names": ["error", "as-needed"],
      "no-restricted-syntax": ["off","ForOfStatement"],
    },
    "env": {
      "browser": true,
      "node": false,
      "greasemonkey": true,
    },
};
