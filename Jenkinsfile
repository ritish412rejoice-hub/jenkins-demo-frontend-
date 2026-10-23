
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('01 - Verify Checkout') {
            steps {
                echo 'Checking source repository'
                sh '''
                    echo "Workspace: $WORKSPACE"
                    echo "Build number: $BUILD_NUMBER"
                    git rev-parse --short HEAD
                    ls -la
                    test -f package.json
                '''
            }
        }

        stage('02 - Check Node.js') {
            steps {
                sh '''
                    node --version
                    npm --version
                '''
            }
        }

        stage('03 - Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('04 - Production Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        success {
            echo 'CI pipeline passed!'
        }

        failure {
            echo 'CI failed. Check the failed stage and logs.'
        }

        always {
            echo 'CI execution finished.'
        }
    }
}
