// openai.js
var express = require('express');
var path = require('path');
const exphbs = require('express-handlebars');
var router = express.Router();

const { OpenAIWrapper, GPTStreamParser } = require('intellinode');
const { USE_DEFAULT_KEYS } = require(path.join(global.__basedir, 'config'));

/* GET api. */
router.get('/', function(req, res, next) {
  res.json({ status: "OK", message: "OpenAI Micro Service is active!" });
});

function getAPIWrapper(req) {

    if (USE_DEFAULT_KEYS && !req.body.api_key) {
        return new OpenAIWrapper(process.env.OPENAI_API_KEY);
    } else {
        return new OpenAIWrapper(req.body.api_key);
    }
}

/**
 * @swagger
 * /openai/chat:
 *   post:
 *     tags:
 *       - Models
 *     summary: Interacts with the chat models in OpenAI to generate a conversation.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - params
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: The api key for OpenAI.
 *               params:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                     description: The language model to use, e.g. 'gpt-3.5-turbo'.
 *                   stream:
 *                     type: boolean
 *                     description: Whether to stream the response.
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                           description: The role of the message sender, can be 'system', or 'user'.
 *                         content:
 *                           type: string
 *                           description: The content of the message.
 *                   max_tokens:
 *                     type: integer
 *                     description: The maximum number of tokens to generate for each response message.
 *                   temperature:
 *                     type: float
 *                     description: The randomness parameter for the output generation.
 *     responses:
 *       200:
 *         description: The generated chat response from OpenAI.
 *       400:
 *         description: There was a problem with the request.
 */
router.post('/chat', async(req, res, next) => {
    try {
        const openai = getAPIWrapper(req);
        const isStream = req.body.params.stream || false;

        if (isStream) {
            const gptStreamParser = new GPTStreamParser();
            const stream = await openai.generateChatText(req.body.params);

            // set streaming headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // collect the data from the stream
            for await (const chunk of stream) {
                const chunkText = chunk.toString('utf8');
                for await (const contentText of gptStreamParser.feed(chunkText)) {
                    res.write(`data: ${contentText}\n\n`); // write directly to the response
                }
            }

            // close the stream
            res.end();
        } else {
            const result = await openai.generateChatText(req.body.params);
            const responseChoices = result.choices;
            res.json({ status: "OK", data: { response: responseChoices } });
        }

    } catch (error) {
        res.json({ status: "ERROR", message: error.message });
    }
});

/**
 * @swagger
 * /openai/text:
 *   post:
 *     tags:
 *       - Models
 *     summary: Generates text using OpenAI's language models.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - params
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: The api key for OpenAI.
 *               params:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                     description: The language model to use, e.g. 'davinci-002'.
 *                   prompt:
 *                     type: string
 *                     description: The prompt to pass to the language model.
 *                   max_tokens:
 *                     type: integer
 *                     description: The maximum number of tokens to be generated by language model.
 *                   n:
 *                     type: integer
 *                     description: Number of independent completions to generate.
 *                   stop:
 *                     type: string
 *                     description: The stop sequence for the output generation.
 *                   temperature:
 *                     type: float
 *                     description: The randomness parameter for the output generation.
 *     responses:
 *       200:
 *         description: The generated text from OpenAI.
 *       400:
 *         description: There was a problem with the request.
 */
router.post('/text', async (req, res, next) => {
    try {
        const openai = getAPIWrapper(req);

        const result = await openai.generateText(req.body.params);
        res.json({ status: "OK", data: result });
    } catch (error) {
        res.json({ status: "ERROR", message: error.message });
    }
});

/**
 * @swagger
 * /openai/embeddings:
 *   post:
 *     tags:
 *       - Models
 *     summary: Generate embeddings for specified text using OpenAI.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - params
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: The api key for OpenAI.
 *               params:
 *                 type: object
 *                 properties:
 *                   input:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Array of text inputs for which embeddings are generated.
 *                   model:
 *                     type: string
 *                     description: The language model to use for embedding generation.
 *     responses:
 *       200:
 *         description: The generated embeddings from OpenAI.
 *       400:
 *         description: There was a problem with the request.
 */
router.post('/embeddings', async (req, res, next) => {
    try {
        const openai = getAPIWrapper(req);
        const result = await openai.getEmbeddings(req.body.params);
        res.json({ status: "OK", data: result });
    } catch (error) {
        res.json({ status: "ERROR", message: error.message });
    }
});

/**
 * @swagger
 * /openai/images:
 *   post:
 *     tags:
 *       - Models
 *     summary: Generate images based on the provided prompt using OpenAI.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - params
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: The api key for OpenAI.
 *               params:
 *                 type: object
 *                 properties:
 *                   prompt:
 *                     type: string
 *                     description: The prompt for the image generation.
 *                   n:
 *                     type: integer
 *                     description: The number of images to generate.
 *                   size:
 *                     type: string
 *                     description: The size of the generated image.
 *     responses:
 *       200:
 *         description: The generated images from OpenAI.
 *       400:
 *         description: There was a problem with the request.
 */
router.post('/images', async (req, res, next) => {
    try {
        const openai = getAPIWrapper(req);
        const result = await openai.generateImages(req.body.params);
        res.json({ status: "OK", data: result });
    } catch (error) {
        res.json({ status: "ERROR", message: error.message });
    }
});

module.exports = router;