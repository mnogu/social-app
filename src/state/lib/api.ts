/**
 * The environment is a place where services and shared dependencies between
 * models live. They are made available to every model via dependency injection.
 */

// import {ReactNativeStore} from './auth'
import AdxApi from '../../third-party/api'
import * as Profile from '../../third-party/api/src/types/todo/social/profile'
import {AdxUri} from '../../third-party/uri'
import {RootStoreModel} from '../models/root-store'
import {extractEntities} from '../../view/lib/strings'

export function doPolyfill() {
  AdxApi.xrpc.fetch = fetchHandler
}

export async function post(
  store: RootStoreModel,
  text: string,
  replyToUri?: string,
) {
  let reply
  if (replyToUri) {
    const replyToUrip = new AdxUri(replyToUri)
    const parentPost = await store.api.todo.social.post.get({
      nameOrDid: replyToUrip.host,
      tid: replyToUrip.recordKey,
    })
    if (parentPost) {
      reply = {
        root: parentPost.value.reply?.root || parentPost.uri,
        parent: parentPost.uri,
      }
    }
  }
  const entities = extractEntities(text)
  return await store.api.todo.social.post.create(
    {did: store.me.did || ''},
    {
      text,
      reply,
      entities,
      createdAt: new Date().toISOString(),
    },
  )
}

export async function like(store: RootStoreModel, uri: string) {
  return await store.api.todo.social.like.create(
    {did: store.me.did || ''},
    {
      subject: uri,
      createdAt: new Date().toISOString(),
    },
  )
}

export async function unlike(store: RootStoreModel, likeUri: string) {
  const likeUrip = new AdxUri(likeUri)
  return await store.api.todo.social.like.delete({
    did: likeUrip.hostname,
    tid: likeUrip.recordKey,
  })
}

export async function repost(store: RootStoreModel, uri: string) {
  return await store.api.todo.social.repost.create(
    {did: store.me.did || ''},
    {
      subject: uri,
      createdAt: new Date().toISOString(),
    },
  )
}

export async function unrepost(store: RootStoreModel, repostUri: string) {
  const repostUrip = new AdxUri(repostUri)
  return await store.api.todo.social.repost.delete({
    did: repostUrip.hostname,
    tid: repostUrip.recordKey,
  })
}

export async function follow(store: RootStoreModel, subject: string) {
  return await store.api.todo.social.follow.create(
    {did: store.me.did || ''},
    {
      subject,
      createdAt: new Date().toISOString(),
    },
  )
}

export async function unfollow(store: RootStoreModel, followUri: string) {
  const followUrip = new AdxUri(followUri)
  return await store.api.todo.social.follow.delete({
    did: followUrip.hostname,
    tid: followUrip.recordKey,
  })
}

export async function updateProfile(
  store: RootStoreModel,
  modifyFn: (existing?: Profile.Record) => Profile.Record,
) {
  const res = await store.api.todo.social.profile.list({
    nameOrDid: store.me.did || '',
  })
  const existing = res.records[0]
  if (existing) {
    await store.api.todo.social.profile.put(
      {
        did: store.me.did || '',
        tid: new AdxUri(existing.uri).recordKey,
      },
      modifyFn(existing.value),
    )
  } else {
    await store.api.todo.social.profile.create(
      {
        did: store.me.did || '',
      },
      modifyFn(),
    )
  }
}

interface FetchHandlerResponse {
  status: number
  headers: Record<string, string>
  body: ArrayBuffer | undefined
}

async function fetchHandler(
  reqUri: string,
  reqMethod: string,
  reqHeaders: Record<string, string>,
  reqBody: any,
): Promise<FetchHandlerResponse> {
  const reqMimeType = reqHeaders['Content-Type'] || reqHeaders['content-type']
  if (reqMimeType && reqMimeType.startsWith('application/json')) {
    reqBody = JSON.stringify(reqBody)
  }

  const res = await fetch(reqUri, {
    method: reqMethod,
    headers: reqHeaders,
    body: reqBody,
  })

  const resStatus = res.status
  const resHeaders: Record<string, string> = {}
  res.headers.forEach((value: string, key: string) => {
    resHeaders[key] = value
  })
  const resMimeType = resHeaders['Content-Type'] || resHeaders['content-type']
  let resBody
  if (resMimeType) {
    if (resMimeType.startsWith('application/json')) {
      resBody = await res.json()
    } else if (resMimeType.startsWith('text/')) {
      resBody = await res.text()
    } else {
      throw new Error('TODO: non-textual response body')
    }
  }
  return {
    status: resStatus,
    headers: resHeaders,
    body: resBody,
  }
  // const res = await fetch(httpUri, {
  //   method: httpMethod,
  //   headers: httpHeaders,
  //   body: encodeMethodCallBody(httpHeaders, httpReqBody),
  // })
  // const resBody = await res.arrayBuffer()
  // return {
  //   status: res.status,
  //   headers: Object.fromEntries(res.headers.entries()),
  //   body: httpResponseBodyParse(res.headers.get('content-type'), resBody),
  // }
}
/*type WherePred = (_record: GetRecordResponseValidated) => Boolean
async function deleteWhere(
  coll: AdxRepoCollectionClient,
  schema: SchemaOpt,
  cond: WherePred,
) {
  const toDelete: string[] = []
  await iterateAll(coll, schema, record => {
    if (cond(record)) {
      toDelete.push(record.key)
    }
  })
  for (const key of toDelete) {
    await coll.del(key)
  }
  return toDelete.length
}

type IterateAllCb = (_record: GetRecordResponseValidated) => void
async function iterateAll(
  coll: AdxRepoCollectionClient,
  schema: SchemaOpt,
  cb: IterateAllCb,
) {
  let cursor
  let res: ListRecordsResponseValidated
  do {
    res = await coll.list(schema, {after: cursor, limit: 100})
    for (const record of res.records) {
      if (record.valid) {
        cb(record)
        cursor = record.key
      }
    }
  } while (res.records.length === 100)
}*/