import { v4 as uuidv4 } from "uuid";
import type {
  LabelClass,
  MutationCreateLabelClassArgs,
  MutationUpdateLabelClassArgs,
  MutationReorderLabelClassArgs,
  MutationDeleteLabelClassArgs,
  QueryLabelClassArgs,
  QueryLabelClassesArgs,
} from "@labelflow/graphql-types";
import { Context, DbLabelClass } from "./types";
import { throwIfResolvesToNil } from "./utils/throw-if-resolves-to-nil";
import { hexColorSequence } from "./utils/class-color-generator";

// Queries
const labels = async (
  labelClass: LabelClass,
  _args: any,
  { repository, user }: Context
) => {
  return await repository.label.list({ labelClassId: labelClass.id, user });
};

const labelClass = async (
  _: any,
  args: QueryLabelClassArgs,
  { repository, user }: Context
) => {
  return await throwIfResolvesToNil(
    "No labelClass with such id",
    repository.labelClass.get
  )({ id: args?.where?.id }, user);
};

const labelClasses = async (
  _: any,
  args: QueryLabelClassesArgs,
  { repository, user }: Context
) => {
  return await repository.labelClass.list(
    { ...args?.where, user },
    args?.skip,
    args?.first
  );
};

// Mutations
const createLabelClass = async (
  _: any,
  args: MutationCreateLabelClassArgs,
  { repository, user }: Context
): Promise<DbLabelClass> => {
  const { color, name, id, datasetId } = args.data;
  const numberLabelClasses = await repository.labelClass.count({
    datasetId,
    user,
  });

  // Since we don't have any constraint checks with Dexie
  // we need to ensure that the datasetId matches some
  // entity before being able to continue.
  await throwIfResolvesToNil(
    `The dataset id ${datasetId} doesn't exist.`,
    repository.dataset.get
  )({ id: datasetId }, user);

  const labelClassId = id ?? uuidv4();
  const now = new Date();

  const newLabelClassEntity = {
    id: labelClassId,
    index: numberLabelClasses,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name,
    color:
      color ?? hexColorSequence[numberLabelClasses % hexColorSequence.length],
    datasetId,
  };
  await repository.labelClass.add(newLabelClassEntity, user);
  return await throwIfResolvesToNil(
    "No labelClass with such id",
    repository.labelClass.get
  )({ id: newLabelClassEntity.id }, user);
};

const reorderLabelClass = async (
  _: any,
  args: MutationReorderLabelClassArgs,
  { repository, user }: Context
) => {
  const labelClassId = args.where.id;

  const labelClassToUpdate = await throwIfResolvesToNil(
    "No labelClass with such id",
    repository.labelClass.get
  )({ id: labelClassId }, user);
  const oldIndex = labelClassToUpdate.index;
  const newIndex = args.data.index;
  if (oldIndex === newIndex) {
    return labelClassToUpdate;
  }
  const labelClassesOfDataset = await repository.labelClass.list({
    datasetId: labelClassToUpdate?.datasetId,
    user,
  });
  if (newIndex < 0 || newIndex > labelClassesOfDataset.length - 1) {
    throw new Error(`Can't reorder a labelClass with an index that is negative or more than the number of labelClasses.
    Received newIndex = ${newIndex} | maximum possible index is ${
      labelClassesOfDataset.length - 1
    }`);
  }

  const indexUpdate = newIndex < oldIndex ? 1 : -1;
  await Promise.all(
    labelClassesOfDataset.map(async (labelClassOfDataset) => {
      if (
        labelClassOfDataset.index === newIndex ||
        (labelClassOfDataset.index > Math.min(oldIndex, newIndex) &&
          labelClassOfDataset.index < Math.max(oldIndex, newIndex))
      ) {
        await repository.labelClass.update(
          { id: labelClassOfDataset.id },
          {
            ...labelClassOfDataset,
            index: labelClassOfDataset.index + indexUpdate,
          },
          user
        );
      }
    })
  );
  await repository.labelClass.update(
    { id: labelClassId },
    {
      ...labelClassToUpdate,
      index: args.data.index,
    },
    user
  );

  return await repository.labelClass.get({ id: labelClassId }, user);
};

const updateLabelClass = async (
  _: any,
  args: MutationUpdateLabelClassArgs,
  { repository, user }: Context
) => {
  const labelClassId = args.where.id;

  const labelClassToUpdate = await throwIfResolvesToNil(
    "No labelClass with such id",
    repository.labelClass.get
  )({ id: labelClassId }, user);

  await repository.labelClass.update(
    { id: labelClassId },
    {
      ...labelClassToUpdate,
      ...args.data,
    },
    user
  );

  return await repository.labelClass.get({ id: labelClassId }, user);
};

const deleteLabelClass = async (
  _: any,
  args: MutationDeleteLabelClassArgs,
  { repository, user }: Context
) => {
  const labelToDelete = await throwIfResolvesToNil(
    "No labelClass with such id",
    repository.labelClass.get
  )({ id: args.where.id }, user);

  await repository.labelClass.delete({ id: labelToDelete.id }, user);
  const labelClassesOfDataset = await repository.labelClass.list({
    datasetId: labelToDelete?.datasetId,
    user,
  });
  await Promise.all(
    labelClassesOfDataset.map(async (labelClassOfDataset) => {
      if (labelClassOfDataset.index > labelToDelete.index) {
        await repository.labelClass.update(
          { id: labelClassOfDataset.id },
          {
            ...labelClassOfDataset,
            index: labelClassOfDataset.index - 1,
          },
          user
        );
      }
    })
  );
  return labelToDelete;
};

const labelClassesAggregates = (parent: any) => {
  // Forward `parent` to chained resolvers if it exists
  return parent ?? {};
};

const totalCount = async (
  parent: any,
  _args: any,
  { repository, user }: Context
) => {
  // eslint-disable-next-line no-underscore-dangle
  const typename = parent?.__typename;

  if (typename === "Dataset") {
    return await repository.labelClass.count({
      datasetId: parent.id,
      user,
    });
  }

  return await repository.labelClass.count({ user });
};

const dataset = async (
  parent: DbLabelClass,
  _args: any,
  { repository, user }: Context
) => {
  return await repository.dataset.get({ id: parent.datasetId }, user);
};

export default {
  Query: {
    labelClass,
    labelClasses,
    labelClassesAggregates,
  },

  Mutation: {
    createLabelClass,
    updateLabelClass,
    deleteLabelClass,
    reorderLabelClass,
  },

  LabelClass: {
    labels,
    dataset,
  },

  LabelClassesAggregates: { totalCount },

  Dataset: {
    labelClassesAggregates,
  },
};
