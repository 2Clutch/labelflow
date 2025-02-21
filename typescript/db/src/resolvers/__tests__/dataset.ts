// eslint-disable-next-line import/no-extraneous-dependencies
import { gql } from "@apollo/client";
import { v4 as uuidV4 } from "uuid";
import {
  MutationCreateWorkspaceArgs,
  Workspace,
} from "@labelflow/graphql-types";
import { prisma } from "../../repository/prisma-client";
import { client, user } from "../../dev/apollo-client";

// @ts-ignore
fetch.disableFetchMocks();

const testUser1Id = uuidV4();
const testUser2Id = uuidV4();

beforeAll(async () => {
  await prisma.user.create({ data: { id: testUser1Id, name: "test-user-1" } });
  await prisma.user.create({ data: { id: testUser2Id, name: "test-user-2" } });
});

beforeEach(async () => {
  user.id = testUser1Id;
  await prisma.membership.deleteMany({});
  return await prisma.workspace.deleteMany({});
});

afterAll(async () => {
  // Needed to avoid having the test process running indefinitely after the test suite has been run
  await prisma.$disconnect();
});

const createWorkspace = async (
  data?: Partial<MutationCreateWorkspaceArgs["data"]>
) => {
  return await client.mutate<{
    createWorkspace: Pick<Workspace, "id" | "name" | "slug" | "plan" | "type">;
  }>({
    mutation: gql`
      mutation createWorkspace($data: WorkspaceCreateInput!) {
        createWorkspace(data: $data) {
          id
          name
          slug
          plan
          type
        }
      }
    `,
    variables: { data: { ...data, name: data?.name ?? "test" } },
  });
};

const createDataset = async (
  name: string,
  workspaceSlug: string,
  datasetId?: string | null
) => {
  return await client.mutate({
    mutation: gql`
      mutation createDataset(
        $datasetId: String
        $name: String!
        $workspaceSlug: String!
      ) {
        createDataset(
          data: { id: $datasetId, name: $name, workspaceSlug: $workspaceSlug }
        ) {
          id
          name
        }
      }
    `,
    variables: {
      name,
      datasetId,
      workspaceSlug,
    },
    fetchPolicy: "no-cache",
  });
};

describe("Access control for dataset", () => {
  it("allows to create a dataset to a user that has access to the workspace", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    expect(createdDataset.data.createDataset.name).toEqual("My dataset");
  });
  it("fails to create a dataset when the user does not have access to the workspace", async () => {
    await createWorkspace({ name: "My workspace" });
    user.id = testUser2Id;
    await expect(() =>
      createDataset("My dataset", "my-workspace")
    ).rejects.toThrow(`User not authorized to access workspace`);
  });
  it("allows to get a dataset to the user that created it", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    const { data } = await client.query({
      query: gql`
        query dataset($id: ID!) {
          dataset(where: { id: $id }) {
            id
            name
          }
        }
      `,
      variables: { id: createdDataset.data.createDataset.id },
      fetchPolicy: "no-cache",
    });
    expect(data.dataset.name).toEqual("My dataset");
  });
  it("fails to get a dataset if the user does not have access to it", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    user.id = testUser2Id;
    await expect(() =>
      client.query({
        query: gql`
          query dataset($id: ID!) {
            dataset(where: { id: $id }) {
              id
              name
            }
          }
        `,
        variables: { id: createdDataset.data.createDataset.id },
        fetchPolicy: "no-cache",
      })
    ).rejects.toThrow(`User not authorized to access dataset`);
  });
  it("allows to get a list of datasets to a user that has access to the workspace", async () => {
    await createWorkspace({ name: "My workspace" });
    await createDataset("My dataset", "my-workspace");
    const { data } = await client.query({
      query: gql`
        query datasets($workspaceSlug: String!) {
          datasets(where: { workspaceSlug: $workspaceSlug }) {
            id
            name
          }
        }
      `,
      variables: { workspaceSlug: "my-workspace" },
      fetchPolicy: "no-cache",
    });
    expect(data.datasets.length).toEqual(1);
  });
  it("returns an emtpy list of datasets if the user does not have access to the workspace", async () => {
    await createWorkspace({ name: "My workspace" });
    await createDataset("My dataset", "my-workspace");
    user.id = testUser2Id;
    const { data } = await client.query({
      query: gql`
        query datasets($workspaceSlug: String!) {
          datasets(where: { workspaceSlug: $workspaceSlug }) {
            id
            name
          }
        }
      `,
      variables: { workspaceSlug: "my-workspace" },
      fetchPolicy: "no-cache",
    });
    expect(data.datasets.length).toEqual(0);
  });
  it("allows to update a dataset to a user that has access to it", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    await client.query({
      query: gql`
        mutation updateDataset($id: ID!, $name: String!) {
          updateDataset(where: { id: $id }, data: { name: $name }) {
            id
            name
          }
        }
      `,
      variables: {
        id: createdDataset.data.createDataset.id,
        name: "Name changed",
      },
      fetchPolicy: "no-cache",
    });
    const { data } = await client.query({
      query: gql`
        query dataset($id: ID!) {
          dataset(where: { id: $id }) {
            id
            name
          }
        }
      `,
      variables: { id: createdDataset.data.createDataset.id },
      fetchPolicy: "no-cache",
    });
    expect(data.dataset.name).toEqual("Name changed");
  });
  it("fails to update a dataset when the user does not have access to it", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    user.id = testUser2Id;
    await expect(() =>
      client.query({
        query: gql`
          mutation updateDataset($id: ID!, $name: String!) {
            updateDataset(where: { id: $id }, data: { name: $name }) {
              id
              name
            }
          }
        `,
        variables: {
          id: createdDataset.data.createDataset.id,
          name: "Name changed",
        },
        fetchPolicy: "no-cache",
      })
    ).rejects.toThrow(`User not authorized to access dataset`);
  });
  it("allows to delete a dataset to a user that has access to it", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    await client.query({
      query: gql`
        mutation deleteDataset($id: ID!) {
          deleteDataset(where: { id: $id }) {
            id
          }
        }
      `,
      variables: {
        id: createdDataset.data.createDataset.id,
      },
      fetchPolicy: "no-cache",
    });
    const { data } = await client.query({
      query: gql`
        query datasets($workspaceSlug: String!) {
          datasets(where: { workspaceSlug: $workspaceSlug }) {
            id
            name
          }
        }
      `,
      variables: { workspaceSlug: "my-workspace" },
      fetchPolicy: "no-cache",
    });
    expect(data.datasets.length).toEqual(0);
  });
  it("fails to delete a dataset to a user that has access to it", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    user.id = testUser2Id;

    await expect(() =>
      client.query({
        query: gql`
          mutation deleteDataset($id: ID!) {
            deleteDataset(where: { id: $id }) {
              id
            }
          }
        `,
        variables: {
          id: createdDataset.data.createDataset.id,
        },
        fetchPolicy: "no-cache",
      })
    ).rejects.toThrow(`User not authorized to access dataset`);
  });
  it.only("allows to get all information from nested resolvers", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");

    const { data } = await client.query({
      query: gql`
        query dataset($id: ID!) {
          dataset(where: { id: $id }) {
            id
            images {
              id
            }
            labels {
              id
            }
            labelClasses {
              id
            }
            workspace {
              id
              slug
            }
          }
        }
      `,
      variables: { id: createdDataset.data.createDataset.id },
      fetchPolicy: "no-cache",
    });
    expect(data.dataset.images.length).toEqual(0);
    expect(data.dataset.labels.length).toEqual(0);
    expect(data.dataset.labelClasses.length).toEqual(0);
    expect(data.dataset.workspace.slug).toEqual("my-workspace");
  });
});

describe("Workflow nested resolver", () => {
  it("allows to query the workspace from the dataset", async () => {
    await createWorkspace({ name: "My workspace" });
    const createdDataset = await createDataset("My dataset", "my-workspace");
    const { data } = await client.query({
      query: gql`
        query dataset($id: ID!) {
          dataset(where: { id: $id }) {
            id
            workspace {
              id
              slug
            }
          }
        }
      `,
      variables: { id: createdDataset.data.createDataset.id },
      fetchPolicy: "no-cache",
    });
    expect(data.dataset.workspace.slug).toEqual("my-workspace");
  });
});
