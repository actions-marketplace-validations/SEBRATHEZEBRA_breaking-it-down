# Breaking-It Down

A way to break down your API Gateway requests to see which services
are taking up most of your time

![Alt example](./public/action-in-ci.png)

## How to use 

Our custom action is used in the following way, in a workflow file:

```
steps:
  - name: Configure AWS credentials with assume role
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_DEV_ROLE_ARN }}
      aws-region: eu-west-2
  - name: Breaking-It-Down
    uses: SEBRATHEZEBRA/breaking-it-down@0.2.0
    with:
      name: "Add to table"
      api-url: "api-path"
      request-body: '{ "itemDescription": "test" }'
```

Where
 - name, is a string that would be the name of the api path you're breaking down
 - api-url, would be the api url path of the endpoint you are wanting to break down
 - request-body, would be the body that is sent to the endpoint