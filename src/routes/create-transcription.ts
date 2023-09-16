import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from 'zod'
import fs from 'node:fs'
import { openAi } from "../lib/openai";
import { text } from "node:stream/consumers";

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post('/videos/:videoId/transcription', async (request, response) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
    })

    const { videoId } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      prompt: z.string(),
    })

    const { prompt } = bodySchema.parse(request.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      }
    })

    const audioReadStream = fs.createReadStream(video.path)

    const openAiResponse = await openAi.audio.translations.create({
      file: audioReadStream,
      model: 'whisper-1',
      response_format: 'json',
      temperature: 0,
      prompt,
    })

    const updatedVideo = await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        transcription: openAiResponse.text,
      }
    })

    return response.status(200).send({ data: { video: updatedVideo } })
  })

}