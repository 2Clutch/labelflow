/* eslint-disable import/first */
// @ts-ignore Needs to be done before ol is imported
global.URL.createObjectURL = jest.fn(() => "mockedUrl");

import { ApolloProvider } from "@apollo/client";
import { Map } from "@labelflow/react-openlayers-fiber";
import { render, waitFor, screen } from "@testing-library/react";
import { Feature, Map as OlMap } from "ol";
import Polygon, { fromExtent } from "ol/geom/Polygon";
import { DrawEvent, DrawEventType } from "ol/interaction/Draw";

import { mockNextRouter } from "../../../../utils/router-mocks";

mockNextRouter({ query: { imageId: "mocked-image-id" } });

import { client } from "../../../../connectors/apollo-client/schema-client";
import { useUndoStore } from "../../../../connectors/undo-store";
import { useLabelingStore, Tools } from "../../../../connectors/labeling-state";
import { setupTestsWithLocalDatabase } from "../../../../utils/setup-local-db-tests";

import { DrawInteraction } from "../draw-interaction";

setupTestsWithLocalDatabase();

jest.mock("../../../../connectors/apollo-client/schema-client", () => {
  const original = jest.requireActual(
    "../../../../connectors/apollo-client/schema-client"
  );
  return {
    client: {
      ...original.client,
      mutate: jest.fn(() => ({
        data: { createLabel: { id: "mocked-label-id" } },
      })),
    },
  };
});

beforeEach(() => {
  (client.mutate as jest.Mock).mockClear();
  useLabelingStore.setState({ selectedTool: Tools.BOX });
});

it("create a label when the user has finished to draw a bounding box on the labeling interface", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  expect(client.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      variables: expect.objectContaining({
        imageId: "mocked-image-id",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [100, 200],
              [100, 300],
              [200, 300],
              [200, 200],
              [100, 200],
            ],
          ],
        },
      }),
    })
  );
});

it("is possible to undo the creation of the label", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  await useUndoStore.getState().undo();

  expect(client.mutate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      variables: { id: "mocked-label-id" },
    })
  );
});

it("should select the newly created label", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  await waitFor(() => {
    expect(useLabelingStore.getState()).toMatchObject({
      selectedLabelId: "mocked-label-id",
    });
  });
});

it("should unset the selected label when the effect is undone", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  await useUndoStore.getState().undo();

  await waitFor(() => {
    expect(useLabelingStore.getState()).toMatchObject({
      selectedLabelId: null,
    });
  });
});

it("is possible to redo an undone action", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  await useUndoStore.getState().undo();
  await useUndoStore.getState().redo();

  expect(client.mutate).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      variables: expect.objectContaining({
        imageId: "mocked-image-id",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [100, 200],
              [100, 300],
              [200, 300],
              [200, 200],
              [100, 200],
            ],
          ],
        },
      }),
    })
  );
});

it("should set back the selected label when the effect is redone after an undone", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  await useUndoStore.getState().undo();
  await useUndoStore.getState().redo();

  await waitFor(() => {
    expect(useLabelingStore.getState()).toMatchObject({
      selectedLabelId: "mocked-label-id",
    });
  });
});

it("handles cases where the label creation throws an error", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  (client.mutate as jest.Mock).mockImplementationOnce(async () => {
    throw new Error("Can't create label");
  });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature(fromExtent([100, 200, 200, 300]))
    )
  );

  expect(client.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      variables: expect.objectContaining({
        imageId: "mocked-image-id",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [100, 200],
              [100, 300],
              [200, 300],
              [200, 200],
              [100, 200],
            ],
          ],
        },
      }),
    })
  );
  await waitFor(() => {
    expect(screen.getByText("Error creating bounding box")).toBeDefined();
  });
});

it("create a label when the user has finished to draw a polygon on the labeling interface", async () => {
  const mapRef: { current: OlMap | null } = { current: null };
  render(<DrawInteraction />, {
    wrapper: ({ children }) => (
      <Map
        args={{ interactions: [] }}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </Map>
    ),
  });

  useLabelingStore.setState({ selectedTool: Tools.POLYGON });

  const drawInteraction = mapRef.current?.getInteractions().getArray()?.[0];
  drawInteraction?.dispatchEvent(
    new DrawEvent(
      "drawend" as DrawEventType,
      new Feature({
        geometry: new Polygon([
          [
            [100, 200],
            [200, 300],
            [250, 350],
            [200, 200],
            [100, 200],
          ],
        ]),
      })
    )
  );

  expect(client.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      variables: expect.objectContaining({
        imageId: "mocked-image-id",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [100, 200],
              [200, 300],
              [250, 350],
              [200, 200],
              [100, 200],
            ],
          ],
        },
      }),
    })
  );
});
