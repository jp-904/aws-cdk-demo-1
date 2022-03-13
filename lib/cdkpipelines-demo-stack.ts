import * as cdk from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import { SecretValue, CfnOutput, Construct, Stack, StackProps } from '@aws-cdk/core';
import * as path from 'path'
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { Repository } from '@aws-cdk/aws-codecommit';

export class CdkpipelinesDemoStack extends cdk.Stack {
  // The url of the api gateway endpoint, use in integrate test
  public readonly urlOutput: CfnOutput;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Set up repo
    const repoName = 'MyRepo'
    const repository = Repository.fromRepositoryName(this, 'Repository', repoName);
    const source = CodePipelineSource.codeCommit(repository, 'master');

    const pipeline = new CodePipeline(this, 'MyPipeline', {
      pipelineName: 'MyServicePipeline',
      crossAccountKeys: true,
      synth: new ShellStep('Synth',{
        installCommands: [ 'npm ci'],
        input: source,
        commands: [
          'npm run test',
          'npm run cdk-synth',
          'echo DONE'
        ],
        primaryOutputDirectory: 'cdk.out'
      })
    })

    //Lambda function

    const handler = new lambda.Function(this, 'MyLambda',{
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'lambda')),
    });

    //Api GW

    const gw = new apigw.LambdaRestApi(this, 'MyGateway',{
      description: 'Endpoint for a simple lambda-function web service',
      handler,
    });

    this.urlOutput = new CfnOutput(this, 'MyUrl',{
      value: gw.url,
    });
  }
}
