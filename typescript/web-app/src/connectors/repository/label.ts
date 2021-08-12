import { DbLabel } from "@labelflow/common-resolvers";
import type { LabelWhereInput } from "@labelflow/graphql-types";
import { getDatabase } from "../database";
import { list } from "./utils/list";

/* `count` and `list` need to handle a specific logic when you want it to be filtered by project
 * We can't do joins with dexies so we need to do it manually. */

export const countLabels = async (where?: LabelWhereInput) => {
  if (where) {
    if ("projectId" in where) {
      const imagesOfProject = await getDatabase()
        .image.where({
          projectId: where.projectId,
        })
        .toArray();

      return getDatabase()
        .label.filter((currentLabel) =>
          imagesOfProject.some((image) => currentLabel.imageId === image.id)
        )
        .count();
    }

    return getDatabase().label.where(where).count();
  }

  return getDatabase().label.count();
};

export const listLabels = async (
  where?: LabelWhereInput | null,
  skip?: number | null,
  first?: number | null
) => {
  if (where && "projectId" in where) {
    const imagesOfProject = await getDatabase()
      .image.where({
        projectId: where.projectId,
      })
      .toArray();

    const query = getDatabase()
      .label.orderBy("createdAt")
      .filter((currentLabel) =>
        imagesOfProject.some((image) => currentLabel.imageId === image.id)
      );

    if (skip) {
      query.offset(skip);
    }
    if (first) {
      query.limit(first);
    }

    return getDatabase()
      .label.filter((currentLabel) =>
        imagesOfProject.some((image) => currentLabel.imageId === image.id)
      )
      .sortBy("createdAt");
  }

  return list<DbLabel, LabelWhereInput>(getDatabase().label)(
    where,
    skip,
    first
  );
};
