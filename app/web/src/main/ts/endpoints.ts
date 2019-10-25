import {graphmodel} from "../../../../common/src/main/ts/graph";
import {ApplicationStats} from "../../../../server/src/main/ts";


export async function getGraph(): Promise<graphmodel.Graph> {
  return fetch(`${window.location}graph`, {
    method: "GET",
    headers: {
      "Content-Type": "Accept: application/json",
    },
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function getStats(seedUrl: string): Promise<ApplicationStats> {
  return fetch(`${window.location}stats/${seedUrl}`, {
    method: "GET",
    headers: {
      "Content-Type": "Accept: application/json",
    },
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function postCrawlerAction(action: 'start' | 'pause' | 'reset', body: any): Promise<ApplicationStats> {
  return fetch(`${window.location}crawler/control/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "Accept: application/json",
    },
    body: JSON.stringify(body),
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function health(): Promise<string> {
  return fetch(window.location + "healthz").then( resp => resp.text());
}

async function handleFailure(resp: Response): Promise<Response> {
  if (!(resp.status >= 200 && resp.status <= 206)) {
    throw new Error(await resp.text());
  } else {
    return resp;
  }
}
