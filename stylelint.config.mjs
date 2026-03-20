/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-order"],
  rules: {
    "order/custom-properties-alphabetical-order": true,
    "order/properties-alphabetical-order": true,
  },
};
