/**
 * @type {import('vitepress').UserConfig}
 */
module.exports = {
  base: "/shared/",
  lang: 'zh-CN',
  title: 'poyoho',
  description: 'blog',
  markdown: {
    lineNumbers: true,
  },

  themeConfig: {
    docsDir: 'docs',
    logo: '/logo.svg',
    editLinks: true,
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: 'Last Updated',

    nav: [
      { text: 'service', link: '/service/index' },
      { text: 'util', link: '/util/index' },
    ],

    sidebar: {
      "/": require("./route/service"),
      "/util": require("./route/util"),
    }
  }
}
