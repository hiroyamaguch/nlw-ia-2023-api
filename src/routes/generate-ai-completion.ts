import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from 'zod'
import fs from 'node:fs'
import { OpenAIStream, streamToResponse, } from 'ai'
import { openAi } from "../lib/openai";
import { text } from "node:stream/consumers";

export async function generateCompleteRoute(app: FastifyInstance) {
  app.post('/ai/complete', async (request, response) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })

    const { videoId, prompt, temperature } = paramsSchema.parse(request.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      }
    })

    if (!video.transcription) {
      return response.status(400).send({ error: "Video transcription was not generated yet." })
    }

    const promptMessage = prompt.replace('{transcription}', video.transcription)

    const openAiResponse = await openAi.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature,
      messages: [
        { role: 'user', content: promptMessage }
      ],
      stream: true,
    })

    const stream = OpenAIStream(openAiResponse)

    streamToResponse(stream, response.raw, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      }
    })
  })

}