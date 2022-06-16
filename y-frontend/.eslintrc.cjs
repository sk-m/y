/* eslint-disable no-undef */

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    overrides: [
        {
          files: ['*.ts', '*.tsx'],
    
          extends: [
            'plugin:@typescript-eslint/recommended',
            'plugin:@typescript-eslint/recommended-requiring-type-checking',
            'plugin:@typescript-eslint/strict',
          ],
    
          parserOptions: {
            project: ['./y-frontend/tsconfig.json'],
          },
        },
      ],
    extends: [
        'eslint:recommended',
    ],
};
