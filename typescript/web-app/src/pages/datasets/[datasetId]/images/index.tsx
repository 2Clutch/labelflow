import { gql, useQuery } from "@apollo/client";
import NextLink from "next/link";
import {
  VStack,
  Box,
  Image,
  Center,
  Spinner,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Wrap,
  WrapItem,
  Heading,
  chakra,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { isEmpty } from "lodash/fp";
import { RiArrowRightSLine } from "react-icons/ri";
import { useErrorHandler } from "react-error-boundary";
import type { Dataset as DatasetType } from "@labelflow/graphql-types";
import { AppLifecycleManager } from "../../../../components/app-lifecycle-manager";
import { KeymapButton } from "../../../../components/keymap-button";
import { ImportButton } from "../../../../components/import-button";
import { ExportButton } from "../../../../components/export-button";
import { Meta } from "../../../../components/meta";
import { Layout } from "../../../../components/layout";
import { EmptyStateImage } from "../../../../components/empty-state";
import { DatasetTabBar } from "../../../../components/layout/tab-bar/dataset-tab-bar";
import Error404Page from "../../../404";

const ArrowRightIcon = chakra(RiArrowRightSLine);

export const datasetDataQuery = gql`
  query getDatasetData($datasetId: ID!) {
    dataset(where: { id: $datasetId }) {
      id
      name
      images {
        id
        name
        url
      }
    }
  }
`;

const ImagesPage = ({
  assumeServiceWorkerActive,
}: {
  assumeServiceWorkerActive: boolean;
}) => {
  const router = useRouter();
  const datasetId = router?.query?.datasetId as string;

  const { data: datasetResult, error } = useQuery<{
    dataset: DatasetType;
  }>(datasetDataQuery, {
    variables: {
      datasetId,
    },
  });

  const datasetName = datasetResult?.dataset.name;

  const handleError = useErrorHandler();
  if (error) {
    if (!error.message.match(/No dataset with id/)) {
      handleError(error);
    }
    return <Error404Page />;
  }

  return (
    <>
      <AppLifecycleManager
        assumeServiceWorkerActive={assumeServiceWorkerActive}
      />
      <Meta title="Labelflow | Images" />
      <Layout
        topBarLeftContent={
          <Breadcrumb
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            spacing="8px"
            sx={{ "*": { display: "inline !important" } }}
            separator={<ArrowRightIcon color="gray.500" />}
          >
            <BreadcrumbItem>
              <NextLink href="/datasets">
                <BreadcrumbLink>Datasets</BreadcrumbLink>
              </NextLink>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <Text>{datasetName}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        }
        topBarRightContent={
          <>
            <KeymapButton />
            <ImportButton />
            <ExportButton />
          </>
        }
        tabBar={<DatasetTabBar currentTab="images" datasetId={datasetId} />}
      >
        {!datasetResult && (
          <Center h="full">
            <Spinner size="xl" />
          </Center>
        )}
        {datasetResult && isEmpty(datasetResult?.dataset?.images) && (
          <Center h="full">
            <Box as="section">
              <Box
                maxW="2xl"
                mx="auto"
                px={{ base: "6", lg: "8" }}
                py={{ base: "16", sm: "20" }}
                textAlign="center"
              >
                <EmptyStateImage w="full" />
                <Heading as="h2">You don&apos;t have any images.</Heading>
                <Text mt="4" fontSize="lg">
                  Fortunately, it’s very easy to add some.
                </Text>

                <ImportButton
                  colorScheme="brand"
                  variant="solid"
                  mt="8"
                  showModal={false}
                />
              </Box>
            </Box>
          </Center>
        )}

        {datasetResult && !isEmpty(datasetResult?.dataset?.images) && (
          <Wrap h="full" spacing={8} padding={8} justify="space-evenly">
            {datasetResult?.dataset?.images?.map(({ id, name, url }) => (
              <NextLink href={`/datasets/${datasetId}/images/${id}`} key={id}>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a>
                  <WrapItem p={4} background="white" rounded={8}>
                    <VStack w="80" h="80" justify="space-between">
                      <Heading
                        as="h3"
                        size="sm"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        w="full"
                      >
                        {name}
                      </Heading>
                      <Image
                        background="gray.100"
                        alt={name}
                        src={url}
                        ignoreFallback
                        objectFit="contain"
                        h="72"
                        w="full"
                      />
                    </VStack>
                  </WrapItem>
                </a>
              </NextLink>
            ))}
          </Wrap>
        )}
      </Layout>
    </>
  );
};

export default ImagesPage;
