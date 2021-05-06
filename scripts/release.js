let { Octokit } = require("@octokit/core")
const ghReleaseAssets = require('gh-release-assets')
const axios = require('axios')
const fs = require('fs')
const moment = require('moment')

require('dotenv').config()

// Octokit = Octokit.plugin(require('octokit-commit-multiple-files'));

const { SONAR_URL, REPO, OWNER,   SAVE_SONAR_REPO,
  SAVE_SONAR_OWNER } = require('./consts.js')

const { TOKEN, RELEASE_MINOR } = process.env;

const octokit = new Octokit({ auth: TOKEN});

const getLatestRelease = async () => {
  const releases = await octokit.request('GET /repos/{owner}/{repo}/releases', {
    owner: OWNER,
    repo: REPO
  })
  return releases.data[0].tag_name  
}

const newTagName = async () => {
  let oldTag = await getLatestRelease()
  oldTag = oldTag.split('.')
  if(RELEASE_MINOR === 'true'){
    const tagNum = parseInt(oldTag[1]) + 1
    return oldTag[0] + '.' + tagNum + '.0'
  } else {
    const tagNum = parseInt(oldTag[2]) + 1
    return oldTag[0] + '.' + oldTag[1] + '.' + tagNum
  }
}

const createRelease = async (tag) => {
  const res = await octokit.request('POST /repos/{owner}/{repo}/releases', {
    owner: OWNER,
    repo: REPO,
    tag_name: tag,
    name: tag
  })
  return res.data.upload_url
}

const generateFilename = (tag) => {
  let date = moment().format('YYYY-MM-DD');
  return tag + '_' + date + '.json'
}

const saveSonarFile = async (filename) => {
  await axios.get(SONAR_URL)
    .then((res) => {
      fs.writeFileSync(`/tmp/${filename}`, JSON.stringify(res.data))
    })
}

const uploadSonarFileToRelease = async (upload_url, tag) => {
  const filename = generateFilename(tag)
  await saveSonarFile(filename)
  ghReleaseAssets({
    url: upload_url,
    token: [TOKEN],
    assets: [
      `/tmp/${filename}`,
      {
        name: filename,
        path: `/tmp/${filename}`
      }
    ]
  })
}

const commitSonarFile = async (tag, filename) => {
  const repoSplit = REPO.split('-')
  const folder = repoSplit[repoSplit.length - 1]

  await octokit.repos.createForAuthenticatedUser({
    name: SAVE_SONAR_REPO,
    description: "testing uploading an image through the GitHub API",
  })

  const commit = await octokit.repos.createOrUpdateFiles({
    SAVE_SONAR_OWNER,
    SAVE_SONAR_REPO,
    // 'main',
    // false,
    changes: [
      {
        message: `Add sonar file of ${tag} ${REPO}`,
        files: {
          "bla.md": "# vai \n"
        },
      }
    ],
  });
}

const script = async () => {
  const tag = await newTagName()
  const filename = generateFilename(tag)
  await saveSonarFile(filename)
  await commitSonarFile(tag, filename)

  // const release = await createRelease(tag)
  // await uploadSonarFileToRelease(release, tag)
}

script()