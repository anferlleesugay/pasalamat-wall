// Pasalamat Wall: CI/CD pipeline (declarative, pipeline as code)
// Push to main -> Checkout -> Test (parallel) -> Build Images -> Deploy -> Smoke Test
// A failing test stops the pipeline before Deploy, so the live site keeps the old version.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()                    // one deploy at a time
        skipDefaultCheckout(true)                    // we check out in our own stage
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        githubPush()                                 // instant: GitHub webhook via ngrok
        pollSCM('H/2 * * * *')                       // fallback: check GitHub every 2 minutes
    }

    environment {
        TAG                  = "${env.BUILD_NUMBER}" // every image is tagged with the build number
        GITHUB_REPO          = 'anferlleesugay/pasalamat-wall'
        COMPOSE_PROJECT_NAME = 'pasalamat'
        DOCKER_BUILDKIT      = '1'
        GEMINI_MODEL         = 'gemini-3.5-flash-lite'
    }

    stages {
        stage('Checkout') {
            steps {
                script { env.CURRENT_STAGE = 'Checkout' }
                checkout scm
                script {
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.SHORT_SHA = env.GIT_COMMIT.take(7)
                }
                sh 'rm -rf ci-logs && mkdir -p ci-logs'
                sh 'git log -1 --pretty="Building %h: %s (by %an)"'
            }
        }

        stage('Test') {
            // Each module runs its own test stage inside Docker, all at the same time
            parallel {
                stage('notes-api · JUnit')        { steps { script { runTests('notes-api') } } }
                stage('studio-api · Jest')        { steps { script { runTests('studio-api') } } }
                stage('moderation-worker · pytest') { steps { script { runTests('moderation-worker') } } }
                stage('frontend · Vitest')        { steps { script { runTests('frontend') } } }
            }
        }

        stage('Build Images') {
            steps {
                script {
                    env.CURRENT_STAGE = 'Build Images'
                    withAppEnv {
                        // Builds all images tagged :<build number>; unchanged layers come from cache
                        logged('build', 'docker compose build')
                        sh '''
                            for s in notes-api moderation-worker studio-api frontend proxy; do
                              docker tag pasalamat/$s:$TAG pasalamat/$s:$SHORT_SHA
                            done
                            docker images --filter "reference=pasalamat/*:$TAG"
                        '''
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    env.CURRENT_STAGE = 'Deploy'
                    withAppEnv {
                        // --wait: only succeeds once every container reports healthy
                        logged('deploy', 'docker compose up -d --no-build --remove-orphans --wait --wait-timeout 240')
                        sh 'docker compose ps'
                    }
                }
            }
        }

        stage('Smoke Test') {
            steps {
                script {
                    env.CURRENT_STAGE = 'Smoke Test'
                    logged('smoke', '''
                    CURL="docker run --rm --network wall-frontend curlimages/curl:8.10.1 -fsS --retry 10 --retry-delay 3 --retry-all-errors"
                    for path in /health /health/notes /health/studio /health/worker /api/notes; do
                      echo "GET $path"; $CURL "http://proxy$path" > /dev/null
                    done
                    echo "Checking the live site serves build #$TAG"
                    $CURL http://proxy/version.json | tee /dev/stderr | grep -q "\\"build\\":\\"$TAG\\""
                    echo "Smoke test passed: build #$TAG is live"
                    ''')
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'ci-logs/*.log', allowEmptyArchive: true
            script { notifyGitHub() }
            sh 'rm -f .env'
        }
        success {
            echo "Build #${env.BUILD_NUMBER} (${env.SHORT_SHA}) is live at http://localhost:8080"
            // Keep the 10 newest build-numbered images per service; older ones free disk space
            sh '''
                for s in notes-api moderation-worker studio-api frontend proxy; do
                  docker images pasalamat/$s --format '{{.Tag}}' | grep -E '^[0-9]+$' | sort -rn | tail -n +11 \
                    | xargs -r -I{} docker rmi pasalamat/$s:{} || true
                done
                docker image prune -f > /dev/null || true
            '''
        }
        failure {
            echo "Build failed at ${env.CURRENT_STAGE}. Nothing was deployed; the previous version is still live."
        }
    }
}

// ---------- helpers ----------

// Run one module's test stage in Docker; keep its output for the AI explanation
def runTests(String module) {
    env.CURRENT_STAGE = 'Test'
    sh """#!/bin/bash
        set -o pipefail
        if docker build --target test --progress=plain -t pasalamat/${module}:test ${module} 2>&1 | tee ci-logs/test-${module}.log; then
          echo "${module}: tests passed"
        else
          cp ci-logs/test-${module}.log ci-logs/FAILED-test-${module}.log
          echo "${module}: TESTS FAILED"
          exit 1
        fi
    """
}

// Run a shell script, saving its output to ci-logs/<name>.log (and FAILED-<name>.log on error)
def logged(String name, String script) {
    writeFile file: "ci-logs/${name}.sh", text: script
    sh """#!/bin/bash
        set -o pipefail
        if bash -e ci-logs/${name}.sh 2>&1 | tee ci-logs/${name}.log; then exit 0; fi
        cp ci-logs/${name}.log ci-logs/FAILED-${name}.log
        exit 1
    """
}

// The production .env lives in Jenkins Credentials (Secret file), never in Git
def withAppEnv(Closure body) {
    withCredentials([file(credentialsId: 'pasalamat-env', variable: 'APP_ENV_FILE')]) {
        sh 'cp "$APP_ENV_FILE" .env'
        body()
    }
}

// Comment ✅/❌ on the GitHub commit; on failure Gemini explains the error
def notifyGitHub() {
    if (!env.GIT_COMMIT) { echo 'No commit checked out; skipping GitHub comment'; return }
    def duration = currentBuild.durationString.replace(' and counting', '')
    withEnv([
        "BUILD_RESULT=${currentBuild.currentResult}",
        "FAILED_STAGE=${env.CURRENT_STAGE ?: ''}",
        "BUILD_DURATION=${duration}",
    ]) {
        withCredentials([
            string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN'),
            string(credentialsId: 'gemini-api-key', variable: 'GEMINI_API_KEY'),
        ]) {
            sh '''#!/bin/bash
                mkdir -p ci-logs
                : > ci-logs/excerpt.txt
                for f in ci-logs/FAILED-*.log; do
                  [ -f "$f" ] && { echo "=== $f"; tail -n 80 "$f"; } >> ci-logs/excerpt.txt
                done
                docker run --rm -i \
                  -e GITHUB_TOKEN -e GITHUB_REPO -e GIT_COMMIT -e BUILD_NUMBER \
                  -e BUILD_RESULT -e FAILED_STAGE -e BUILD_DURATION -e GEMINI_API_KEY -e GEMINI_MODEL \
                  python:3.12.7-alpine python -c "$(cat ci/notify.py)" < ci-logs/excerpt.txt \
                  || echo "GitHub comment failed (ignored)"
            '''
        }
    }
}
