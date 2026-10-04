export default defineEventHandler(async (event): Promise<DataWithFreshness<ObjectStatisticDetailDto>> => {
  const bareKey = getRouterParam(event, 'key')
  const result = bareKey ? await buildObjectStatisticDetail(bareKey, 'entities') : null

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Entity nicht gefunden' })
  }

  return result
})
