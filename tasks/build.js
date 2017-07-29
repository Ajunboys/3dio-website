// gulp4 is awesome!! https://github.com/gulpjs/gulp/tree/4.0

const Promise = require('bluebird')
const path = require('path')
const fs = require('fs')
const execSync = require('child_process').execSync
// gulp related
const gulp = require('gulp')
const del = require('del')
const through2 = require('through2')
const Vinyl = require('vinyl')
// render content
const pug = require('pug')
const less = require('gulp-less')
const marked = require('marked')
const yaml = require('js-yaml')
const pygmentize = require('pygmentize-bundled')

const gitBranchName = process.env.TRAVIS_BRANCH || execSync(`git rev-parse --abbrev-ref HEAD`).toString('utf8').replace('\n', '')
const gitCommitSha1 = execSync(`git rev-parse HEAD`).toString('utf8').replace('\n', '')
// only branches deployed by CI have root directories
// all other environments are running on root dir
const urlPathRoot = process.env.TRAVIS_BRANCH && process.env.TRAVIS_BRANCH !== 'master' ? '/branch/'+process.env.TRAVIS_BRANCH : ''

// configs

const debug = false
const src = {
  pug: [
    'src/**/*.pug',
    '!src/pug-common/**/**'
  ],
  markdown: [
    // the first ** are necessary to mark 'src' as base dir for output paths
    'src/**/*.md',
    '!src/**/partner/*.md'
  ],
  partnerProfiles: [
    // the first ** are necessary to mark 'src' as base dir for output paths
    'src/**/partner/*.md'
  ],
  less: [
    // the first ** are necessary to mark 'src' as base dir for output paths
    'src/**/css/*.less',
    'src/**/font/**/*.less'
  ],
  staticContent: [
    'src/**/**',
    '!src/pug-common',
    '!src/pug-common/**/**',
    '!src/**/*.pug',
    '!src/**/*.md',
    '!src/**/*.less'
  ]
}
const dest = 'build'

// bootstrap

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  sanitize: false,
  highlight (code, lang, callback) {
    return pygmentize({lang: lang, format: 'html'}, code, (err, result) => {
      callback(err, result.toString())
    })
  }
})

// tasks

const build = gulp.series(
  cleanBuildDir,
  gulp.parallel(
    generatePartnerProfilePages,
    copyStaticContent,
    renderPug,
    renderMarkdown,
    renderLess
  )
)

function cleanBuildDir () {
  return del([dest])
}

function copyStaticContent () {
  return gulp.src(src.staticContent).pipe(gulp.dest(dest))
}

function renderPug () {
  return gulp.src(src.pug).pipe(through2.obj((inputFile, enc, cb) => {
    // process files only
    if (!inputFile.isBuffer()) return
    // decode text from vinyl object
    const pugText = inputFile.contents.toString(enc)
    // render pug to html
    let html = pug.render(pugText, {
      // pug options
      filename: inputFile.path,
      pretty: debug,
      // generic template helper functions
      require: require,
      getAllPartnerInfo: getAllPartnerInfo,
      // generic template variables
      urlPathRoot: urlPathRoot,
      githubLink: getGithubEditLink(inputFile)
    })
    // pug renderer wraps code tags into pre tegs. we dont want that
    html = html.replace(/<pre>[\n\s]*<code/gmi, '<code').replace(/<\/code>[\n\s]*<\/pre>/gmi, '</code>')
    // remap relative links and markdown links
    html = remapLinks(html, inputFile)
    // create vinyl object for output
    const outputFile = new Vinyl({
      cwd: inputFile.cwd, base: inputFile.base,
      path: inputFile.path.replace('.pug', '.html'),
      contents: new Buffer(html)
    })
    // return
    cb(null, outputFile)
  })).pipe(gulp.dest(dest))
}

function generatePartnerProfilePages () {
  return gulp.src(src.partnerProfiles).pipe(through2.obj((inputFile, enc, cb) => {
    // process files only
    if (!inputFile.isBuffer()) return
    // decode text from vinyl object
    let markdownText = inputFile.contents.toString(enc)
    const urlPath = urlPathRoot+'/'+inputFile.path.substr(inputFile.base.length)
    const urlPathDir = path.dirname(urlPath)+'/'
    const partnerProfileTemplate = path.resolve(process.cwd(), 'src/pug-common/partner-profile-page.pug')
    getAllPartnerInfo()
    // get partner info
    const partner = parsePartnerInfo(markdownText, inputFile.path)
    // remove partner-info tag from markdown
    markdownText = removePartnerInfo(markdownText)
    // convert markdown to html
    marked(markdownText, (err, content) => {
      if (err) return cb(err)
      // render pug to html
      html = pug.renderFile(partnerProfileTemplate, {
        // pug options
        filename: partnerProfileTemplate,
        cache: true,
        pretty: debug,
        // content
        partner: partner,
        content: content,
        // generic template variable
        urlPathRoot: urlPathRoot,
        githubLink: getGithubEditLink(inputFile)
      })
      // remap relative links and markdown links
      html = remapLinks(html, inputFile)
      // create vinyl object for output
      const outputFile = new Vinyl({
        cwd: inputFile.cwd, base: inputFile.base,
        path: inputFile.path.replace('.md', '.html'),
        contents: new Buffer(html)
      })
      // return
      cb(null, outputFile)
    })
  })).pipe(gulp.dest(dest))
}

function renderMarkdown () {
  return gulp.src(src.markdown).pipe(through2.obj((inputFile, enc, cb) => {
    // process files only
    if (!inputFile.isBuffer()) return
    // decode text from vinyl object
    const markdownText = inputFile.contents.toString(enc)
    // convert markdown to html
    marked(markdownText, (err, content) => {
      if (err) return cb(err)
      // render pug to html
      const pugMarkdownWrapper = path.resolve(process.cwd(), 'src/pug-common/md-wrapper.pug')
      html = pug.renderFile(pugMarkdownWrapper, {
        // pug options
        filename: pugMarkdownWrapper,
        cache: true,
        pretty: debug,
        // template variables
        content: content,
        // generic template variable
        urlPathRoot: urlPathRoot,
        githubLink: getGithubEditLink(inputFile)
      })
      // pug renderer wraps code tags into pre tegs. we dont want that
      html = html.replace(/<pre>[\n\s]*<code/gmi, '<code').replace(/<\/code>[\n\s]*<\/pre>/gmi, '</code>')
      // remap relative links and markdown links
      html = remapLinks(html, inputFile)
      // create vinyl object for output
      const outputFile = new Vinyl({
        cwd: inputFile.cwd, base: inputFile.base,
        path: inputFile.path.replace('.md', '.html'),
        contents: new Buffer(html)
      })
      // return
      cb(null, outputFile)
    })
  })).pipe(gulp.dest(dest))
}

function renderLess () {
  return gulp.src(src.less)
    .pipe(less({
      paths: [path.join(__dirname, 'less', 'includes')],
      compress: !debug
    }))
    .pipe(gulp.dest(dest))
}

// helpers

const aTagInHtmlRegex = /\<a *[^\/>]*href="([^"]*|\\")*"*[^\/>]*\>/gi
const mdExtensionInUrlRegex = /(\.md)/gi
function remapLinks (html, inputFile) {
  const urlPath = urlPathRoot+'/'+inputFile.path.substr(inputFile.base.length)
  const urlPathDir = (path.dirname(urlPath)+'/').replace('//','/')
  return html.replace(aTagInHtmlRegex, function (tag, url) {
    if (!url || url.substr(0, 7) === 'mailto:') {
      // don't modife empty href tag and email links
      return tag
    } else if (url.substr(0, 4) === 'http') {
      // open all external pages in new tab
      if (
        url.substr(0, 12) === 'http://3d.io'
        || url.substr(0, 13) === 'https://3d.io'
        || tag.indexOf('target=') > -1
      ) {
        // refers to 3d.io or has target attribute set
        return tag
      } else {
        // add target attribute
        return tag.replace('<a ', '<a target="_blank" ')
      }
    } else {
      // add root path to relative pages
      return tag.replace(
        url,
        url[0] === '/' ? urlPathRoot + url : urlPathDir + url
      // replace .md extensions by .html
      ).replace(
        mdExtensionInUrlRegex,
        '.html'
      )
    }
  })
}

function markdownToHtml (md) {
  return new Promise((resolve, reject) => {
    marked(md, (err, html) => {
      err ? reject(err) : resolve(html)
    })
  })
}

function getGithubEditLink (file) {
  var relativePath = 'src/'+file.path.substr(file.base.length)
  return `https://github.com/archilogic-com/3d-io-website/edit/${gitBranchName}/${relativePath}`
}

function getAllPartnerInfo () {
  const dir = process.cwd() + '/src/partner'
  const files = fs.readdirSync(dir)
  const partners = []
  files.forEach(function (file) {
    if (file === 'apply.md') return
    const info = parsePartnerInfo(fs.readFileSync(dir+'/'+file), file)
    info.filename = file
    partners.push(info)
  })
  return partners
}

const partnerInfoTagRegex = `<script id="partner-info" type="application/x-yaml">([\\n\\s\\S]*)</script>`
const missingEmptySpaceRegex = /^[\sa-z0-1_-]+(:)[a-z0-1_-]/gmi

function parsePartnerInfo (str, path) {
  const infoSearch = new RegExp(partnerInfoTagRegex).exec(str)
  if (!infoSearch) throw `Partner page ${path} has malformed or missing <script id="partner-info" type="application/x-yaml">...</script> tag`
  let info, yamlText
  try {
    yamlText = infoSearch[1]
    // catch typos related to empty spaces
    //  console.log(/^[\sa-z0-1_-]+(:)[a-z0-1_-]/gmi.exec(yamlText))
    yamlText = yamlText.replace(missingEmptySpaceRegex, function(match, group){
      console.warn(`Fixed missing empty space in YAML part of file ${path} : ${match}`)
      return match.replace(':', ': ')
    })
    info = yaml.safeLoad(yamlText)
  } catch (e) {
    throw `Sorry, "partner-info" of page ${path} can not be parsed and is probably malformed. Read YAML specs: http://yaml.org/spec/`
  }
  // placeholders
  if (!info.LOGO) info.LOGO = 'https://archilogic-com.github.io/ui-style-guide/certified-partner/archilogic-partner-badge-pyramid-gradient.svg'
  if (!info.LOGO_BG_COLOR) info.LOGO_BG_COLOR = '#ddd'
  info.LOGO_SIZE = info.LOGO_SIZE ? parseFloat(info.LOGO_SIZE) : 84
  if (info.SAMPLES) {
    info.SAMPLES.forEach(function(sample){
      sample.PRICE = sample.PRICE ? parseFloat(sample.PRICE) : undefined
    })
  } else {
    info.SAMPLES = []
  }
  info.LOCATION_LAT = info.LOCATION_LAT ? parseFloat(info.LOCATION_LAT) : undefined
  info.LOCATION_LNG = info.LOCATION_LNG ? parseFloat(info.LOCATION_LNG) : undefined
  return info
}

function removePartnerInfo (str) {
  return str.replace(new RegExp(partnerInfoTagRegex), '')
}

// export

module.exports = {
  build: build,
  renderPug: renderPug,
  renderMarkdown: renderMarkdown,
  renderLess: renderLess,
  copyStaticContent: copyStaticContent
}
