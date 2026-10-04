export default defineEventHandler(async (event): Promise<DataWithFreshness<ObjectStatisticDetailDto>> => {
  const bareKey = getRouterParam(event, 'key')
  const result = bareKey ? await buildObjectStatisticDetail(bareKey, 'items') : null

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Item nicht gefunden' })
  }

  return result
})
