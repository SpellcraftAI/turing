## A::B Eval

This is a simple evaluator for the [A::B](https://gist.github.com/VictorTaelin/8ec1d8a0a3c87af31c25224a1f7e31ec) prompting challenge.

To use it, add your Anthropic/OpenAi key to your home directory:

    ~/.config/anthropic.token
    ~/.config/openai.token

Then, add 2 files to this directory:

    ./users/YOUR_NAME/prompt.txt # the system prompt
    ./users/YOUR_NAME/model.txt  # the model name

Then, clone this repository, perform `npm install` and run `node main.mjs YOUR_NAME`.
