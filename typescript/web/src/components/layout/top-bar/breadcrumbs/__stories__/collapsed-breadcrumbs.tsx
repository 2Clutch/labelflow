import React from "react";
import { BreadcrumbLink, Skeleton, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { chakraDecorator } from "../../../../../utils/chakra-decorator";

import { CollapsedBreadcrumbs } from "../collapsed-breadcrumbs";

export default {
  title: "web/Breadcrumbs/Collapsed",
  decorators: [chakraDecorator],
};

export const Empty = () => {
  return <CollapsedBreadcrumbs />;
};

export const Loading = () => {
  return (
    <CollapsedBreadcrumbs>
      <NextLink href="/local/datasets">
        <BreadcrumbLink>Datasets</BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <Skeleton>Dataset Name</Skeleton>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>Images</BreadcrumbLink>
      </NextLink>

      <Skeleton>Image Name</Skeleton>
    </CollapsedBreadcrumbs>
  );
};

export const Normal = () => {
  return (
    <CollapsedBreadcrumbs>
      <NextLink href="/local/datasets">
        <BreadcrumbLink>Datasets</BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>Hello</BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>Images</BreadcrumbLink>
      </NextLink>

      <Text>World</Text>
    </CollapsedBreadcrumbs>
  );
};

export const LongNames = () => {
  return (
    <CollapsedBreadcrumbs>
      <NextLink href="/local/datasets">
        <BreadcrumbLink>Datasets</BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>
          Hello this is a very long dataset name is it not ?
        </BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>Images</BreadcrumbLink>
      </NextLink>

      <Text>Wow such a looooooooooong image name bro ! What the hell</Text>
    </CollapsedBreadcrumbs>
  );
};

export const WithLastElementCurrent = () => {
  return (
    <CollapsedBreadcrumbs containsLastElement>
      <NextLink href="/local/datasets">
        <BreadcrumbLink>Datasets</BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>
          Hello this is a very long dataset name is it not ?
        </BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>Images</BreadcrumbLink>
      </NextLink>

      <Text>Something else</Text>

      <Text>Wow such a looooooooooong image name bro ! What the hell</Text>
    </CollapsedBreadcrumbs>
  );
};

export const WithCustomIcon = () => {
  return (
    <CollapsedBreadcrumbs icon={<Text>This text could be an icon!</Text>}>
      <NextLink href="/local/datasets">
        <BreadcrumbLink>Datasets</BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>
          Hello this is a very long dataset name is it not ?
        </BreadcrumbLink>
      </NextLink>

      <NextLink href="/local/datasets/xxx/images">
        <BreadcrumbLink>Images</BreadcrumbLink>
      </NextLink>

      <Text>Something else</Text>

      <Text>Wow such a looooooooooong image name bro ! What the hell</Text>
    </CollapsedBreadcrumbs>
  );
};
