import { trim } from "lodash/fp";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";
import { add } from "date-fns";
import {
  DatasetWhereUniqueInput,
  MutationCreateDatasetArgs,
  MutationDeleteDatasetArgs,
  MutationUpdateDatasetArgs,
  QueryDatasetArgs,
  QueryDatasetsArgs,
  QueryImagesArgs,
} from "@labelflow/graphql-types";
import { Context, DbDataset, Repository } from "./types";
import { getImageEntityFromMutationArgs } from "./image";
import {
  tutorialDatasets,
  tutorialImages,
  tutorialLabelClasses,
  tutorialLabels,
} from "./data/dataset-tutorial";

const getLabelClassesByDatasetId = async (
  datasetId: string,
  repository: Repository
) => {
  return await repository.labelClass.list({ datasetId });
};

const getDataset = async (
  where: DatasetWhereUniqueInput,
  repository: Repository
): Promise<DbDataset & { __typename: "Dataset" }> => {
  const datasetFromRepository = await repository.dataset.get(where);
  if (datasetFromRepository == null) {
    throw new Error(
      `Couldn't find dataset corresponding to ${JSON.stringify(where)}`
    );
  }
  return { ...datasetFromRepository, __typename: "Dataset" };
};

const searchDataset = async (
  _: any,
  args: QueryDatasetArgs,
  { repository }: Context
): Promise<(DbDataset & { __typename: string }) | undefined> => {
  const datasetFromRepository = await repository.dataset.get(args.where);
  return datasetFromRepository != null
    ? { ...datasetFromRepository, __typename: "Dataset" }
    : undefined;
};

// Queries
const images = async (
  dataset: DbDataset,
  args: QueryImagesArgs,
  { repository }: Context
) => {
  return await repository.image.list(
    { datasetId: dataset.id },
    args?.skip,
    args?.first
  );
};

const labels = async (
  dataset: DbDataset,
  _args: any,
  { repository }: Context
) => {
  return await repository.label.list({ datasetId: dataset.id });
};

const labelClasses = async (
  dataset: DbDataset,
  _args: any,
  { repository }: Context
) => {
  return await getLabelClassesByDatasetId(dataset.id, repository);
};

const dataset = async (
  _: any,
  args: QueryDatasetArgs,
  { repository }: Context
): Promise<DbDataset & { __typename: string }> =>
  await getDataset(args.where, repository);

const datasets = async (
  _: any,
  args: QueryDatasetsArgs,
  { repository }: Context
): Promise<DbDataset[]> => {
  const queryResult = await repository.dataset.list(
    null,
    args.skip,
    args.first
  );

  return queryResult.map((datasetWithoutTypename) => ({
    ...datasetWithoutTypename,
    __typename: "Dataset",
  }));
};

// Mutations
const createDataset = async (
  _: any,
  args: MutationCreateDatasetArgs,
  { repository }: Context
): Promise<DbDataset & { __typename: string }> => {
  const date = new Date().toISOString();

  const datasetId = args?.data?.id ?? uuidv4();
  const name = trim(args?.data?.name);

  if (name === "") {
    throw new Error("Could not create the dataset with an empty name");
  }

  const dbDataset = {
    id: datasetId,
    createdAt: date,
    updatedAt: date,
    name,
    slug: slugify(name, { lower: true }),
    workspaceSlug: args.data.workspaceSlug,
  };
  try {
    await repository.dataset.add(dbDataset);

    return await getDataset({ id: datasetId }, repository);
  } catch (e) {
    console.error(e);
    throw new Error(
      `Could not create the dataset ${JSON.stringify(dbDataset)}`
    );
  }
};

const createDemoDataset = async (
  _: any,
  args: {},
  { repository, req }: Context
): Promise<DbDataset> => {
  const now = new Date();
  const currentDate = now.toISOString();

  try {
    await repository.dataset.add({
      ...tutorialDatasets[0],
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  } catch (error) {
    if (error.name === "ConstraintError") {
      // The tutorial dataset already exists, just return it
      return await getDataset(
        {
          slugs: {
            datasetSlug: "tutorial-dataset",
            workspaceSlug: "local",
          },
        },
        repository
      );
    }
    throw error;
  }

  await Promise.all(
    tutorialImages.map(async (image, index) => {
      const imageEntity = await getImageEntityFromMutationArgs(
        {
          ...image,

          createdAt: add(now, { seconds: index }).toISOString(),
          name: image.url.match(/\/static\/img\/(.*?)$/)?.[1],
        },
        {
          upload: repository.upload,
        },
        req
      );
      return await repository.image.add(imageEntity);
    })
  );

  await Promise.all(
    tutorialLabelClasses.map(async (labelClass) => {
      return await repository.labelClass.add({
        ...labelClass,
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    })
  );

  await Promise.all(
    tutorialLabels.map(async (label) => {
      return await repository.label.add({
        ...label,
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    })
  );

  return await getDataset({ id: tutorialDatasets[0]?.id }, repository);
};

const updateDataset = async (
  _: any,
  args: MutationUpdateDatasetArgs,
  { repository }: Context
): Promise<DbDataset> => {
  const datasetToUpdate = await getDataset(args.where, repository);

  const newData =
    "name" in args.data
      ? { ...args.data, slug: slugify(args.data.name, { lower: true }) }
      : args.data;

  try {
    const updateResult = await repository.dataset.update(
      { id: datasetToUpdate.id },
      newData
    );
    if (!updateResult) {
      throw new Error("Could not update the dataset");
    }
  } catch (e) {
    throw new Error("Could not update the dataset");
  }

  return await getDataset({ id: datasetToUpdate.id }, repository);
};

const deleteDataset = async (
  _: any,
  args: MutationDeleteDatasetArgs,
  { repository }: Context
): Promise<DbDataset> => {
  const datasetToDelete = await getDataset(args.where, repository);

  const imagesOfDataset = await repository.image.list({
    datasetId: args.where.id,
  });
  await Promise.all(
    imagesOfDataset.map(
      async (image) => await repository.upload.delete(image.url)
    )
  );
  await repository.dataset.delete({ id: datasetToDelete.id });
  return datasetToDelete;
};

export default {
  Query: {
    dataset,
    datasets,
    searchDataset,
  },

  Mutation: {
    createDataset,
    createDemoDataset,
    updateDataset,
    deleteDataset,
  },

  Dataset: {
    images,
    labels,
    labelClasses,
  },
};
