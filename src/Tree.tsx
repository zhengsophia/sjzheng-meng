import * as React from 'react';
import { useEffect, useState } from "react";
import Box from '@mui/material/Box';
import { TreeViewBaseItem } from '@mui/x-tree-view/models';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

const convertToTreeViewItems = (json: any, parentId = ""): TreeViewBaseItem[] => {
  return json.groups.map((group: any, groupIndex: number) => {
    const groupId = `${parentId}group-${groupIndex}`;
    return {
      id: groupId,
      label: group.name,
      children: group.subgroups.map((subgroup: any, subgroupIndex: number) => {
        const subgroupId = `${groupId}-subgroup-${subgroupIndex}`;
        return {
          id: subgroupId,
          label: subgroup.name,
          children: subgroup.cells.map((cell: number) => ({
            id: `${subgroupId}-cell-${cell}`,
            label: `Cell ${cell}`,
          })),
        };
      }),
    };
  });
};

export default function BasicRichTreeView() {
  const [labels, setLabels] = useState<TreeViewBaseItem[]>([]);

  useEffect(() => {
    console.log("useEffect triggered");

    const fetchNotebook = async () => {
      try {
        const response = await fetch('http://localhost:3001/notebooks/amazon_reviews_logit_tfidf.ipynb');
        if (!response.ok) throw new Error('Failed to fetch notebook');
        console.log('response', response)
        const notebookHierarchized = await response.json();
        console.log('notebook response:', notebookHierarchized);
        
        const treeItems = convertToTreeViewItems(notebookHierarchized.data);
        console.log('tree items', treeItems);
        setLabels(treeItems);
      } catch (error) {
        console.error('Error fetching notebook:', error);
      }
    };

    fetchNotebook();
  }, []); // dependency array so only runs once on mount

  return (
    <Box sx={{ minHeight: 352, minWidth: 250 }}>
      {labels.length > 0 ? (
        <RichTreeView 
        items={labels} 
        sx={{
          '& .MuiTreeItem-label': {
            textAlign: 'left', 
          },
        }}
      />
      ) : (
        <p>Loading notebook data...</p> 
      )}
    </Box>
  );
}