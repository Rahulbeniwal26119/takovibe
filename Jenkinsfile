pipeline {
    agent any

    triggers {
        githubPush()
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        VPS_IP = '54.38.65.238'
    }

    stages {
    stage('Prepare') {
      steps {
        echo "✅ Repository already checked out by Jenkins"
      }
    }

        stage("Deploy To VPS") {
            steps {
                sshagent (credentials: ['vps-ssh']) {
                    sh '''
                        echo "🔗 Connecting to VPS..."
                        ssh -o StrictHostKeyChecking=no ubuntu@$VPS_IP "
                        echo '--- Running on:' $(hostname) '--- User:' $(whoami)
                        cd /home/ubuntu/blog &&
                        git pull origin master &&
                        chmod +x build_hybrid.sh &&
                        sudo ./build_hybrid.sh
                        "
                '''
                }
            }
        }
    }

    post {
    success {
      echo '✅ Deployment successful! 🚀 Site is live.'
    }
    failure {
      echo '❌ Deployment failed! Check build logs for errors.'
    }
  }
}