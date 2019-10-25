import {graphmodel} from "../../../../common/src/main/ts/graph";
import {ApplicationStats} from "../../../../server/src/main/ts";

export async function getGraph(): Promise<graphmodel.Graph> {
  return fetch(window.location + "graph", {
    method: "GET",
    headers: {
      "Content-Type": "Accept: application/json",
    },
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function getGraphLive(): Promise<graphmodel.Graph> {
  return fetch(window.location + "graph-live", {
    method: "GET",
    headers: {
      "Content-Type": "Accept: application/json",
    },
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function getGraphLive2(): Promise<graphmodel.Graph> {
  return fetch(window.location + "graph-live2", {
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

export async function googlePlacesAutocomplete(
  query: string
): Promise<any> {
  return fetch(window.location + "google/places-autocomplete/" + query, {
    method: "GET",
    headers: {
      "Content-Type": "Accept: application/json",
    },
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function googleDistanceMatrix(req: any): Promise<any> {
  console.warn("Distance matrix request");
  return fetch(`${window.location}google/distance-matrix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  }).then(handleFailure)
    .then(resp => resp.json())
    .catch(err => console.error(err));
}

export async function health(): Promise<string> {
  return fetch(window.location + "healthz").then( resp => resp.text());
}

async function handleFailure(resp: Response): Promise<Response> {
  if (resp.status !== 200) {
    throw new Error(await resp.text());
  } else {
    return resp;
  }
}
