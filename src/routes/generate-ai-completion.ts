import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from 'zod'
import fs from 'node:fs'
import { openAi } from "../lib/openai";
import { text } from "node:stream/consumers";

export async function generateCompleteRoute(app: FastifyInstance) {
  app.post('/ai/complete', async (request, response) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
      template: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })

    const { videoId, template, temperature } = paramsSchema.parse(request.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      }
    })

    if (!video.transcription) {
      return response.status(400).send({ error: "Video transcription was not generated yet." })
    }

    const promptMessage = template.replace('{transcription}', video.transcription)

    const openAiResponse = await openAi.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature,
      messages: [
        { role: 'user', content: promptMessage }
      ]
    })

    return response.status(200).send({ data: { text: openAiResponse.choices[0].message.content } })
  })

}