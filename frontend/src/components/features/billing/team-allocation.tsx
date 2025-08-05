import React from "react";
import { useTeam } from "#/hooks/use-team";
import { useTeamMembers } from "#/hooks/query/use-team-members";
import { useUpdateMemberAllocation } from "#/hooks/mutation/use-update-member-allocation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Input } from "#/components/ui/input";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { Progress } from "#/components/ui/progress";
import { Skeleton } from "#/components/ui/skeleton";

interface TeamMemberAllocation {
  user_id: string;
  allocation_type: "unlimited" | "percentage" | "fixed" | "equal";
  allocation_value?: number;
  tokens_used_current_period: number;
}

interface TeamUsageData {
  breakdown: Array<{
    user_id: string;
    tokens_used: number;
    percentage_of_total: number;
  }>;
}

// Mock hook for team usage - would be implemented similar to other query hooks
const useTeamUsageBreakdown = (teamId: string) =>
  // Mock implementation - in real implementation, this would fetch from /api/billing/teams/{teamId}/usage
  ({
    data: {
      breakdown: [],
    } as TeamUsageData,
    isLoading: false,
  });
export function TeamTokenAllocation() {
  const { activeTeam } = useTeam();
  const { data: members, isLoading: membersLoading } = useTeamMembers(
    activeTeam?.id || "",
  );
  const { data: usage } = useTeamUsageBreakdown(activeTeam?.id || "");
  const { mutate: updateAllocation } = useUpdateMemberAllocation();

  const [editingMember, setEditingMember] = React.useState<string | null>(null);
  const [allocations, setAllocations] = React.useState<
    Record<string, { type: string; value?: number }>
  >({});

  if (!activeTeam) {
    return null;
  }

  if (membersLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSaveAllocation = (memberId: string) => {
    const allocation = allocations[memberId];
    if (allocation) {
      updateAllocation({
        teamId: activeTeam.id,
        userId: memberId,
        allocationType: allocation.type as any,
        allocationValue: allocation.value,
      });
      setEditingMember(null);
    }
  };

  const getAllocationDisplay = (member: any) => {
    const allocation = allocations[member.id] || member.allocation || {};

    switch (allocation.type || "unlimited") {
      case "unlimited":
        return <Badge variant="default">Unlimited</Badge>;
      case "percentage":
        return <Badge variant="secondary">{allocation.value || 0}%</Badge>;
      case "fixed":
        return (
          <Badge variant="secondary">
            {(allocation.value || 0).toLocaleString()} tokens
          </Badge>
        );
      case "equal":
        return <Badge variant="secondary">Equal Share</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Token Allocation</CardTitle>
        <CardDescription>
          Control how tokens are distributed among team members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead>Used This Period</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((member: any) => {
              const memberUsage = usage?.breakdown.find(
                (u) => u.user_id === member.id,
              );
              const usagePercentage = memberUsage?.percentage_of_total || 0;
              const isEditing = editingMember === member.id;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-sm text-gray-500">
                        {member.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Select
                          value={
                            allocations[member.id]?.type ||
                            member.allocation_type ||
                            "unlimited"
                          }
                          onValueChange={(value) =>
                            setAllocations({
                              ...allocations,
                              [member.id]: {
                                ...allocations[member.id],
                                type: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unlimited">Unlimited</SelectItem>
                            <SelectItem value="percentage">
                              Percentage
                            </SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="equal">Equal Share</SelectItem>
                          </SelectContent>
                        </Select>

                        {["percentage", "fixed"].includes(
                          allocations[member.id]?.type ||
                            member.allocation_type ||
                            "",
                        ) && (
                          <Input
                            type="number"
                            value={
                              allocations[member.id]?.value ||
                              member.allocation_value ||
                              0
                            }
                            onChange={(e) =>
                              setAllocations({
                                ...allocations,
                                [member.id]: {
                                  ...allocations[member.id],
                                  value: parseInt(e.target.value),
                                },
                              })
                            }
                            className="w-24"
                            placeholder={
                              (allocations[member.id]?.type ||
                                member.allocation_type) === "percentage"
                                ? "0-100"
                                : "Tokens"
                            }
                          />
                        )}
                      </div>
                    ) : (
                      getAllocationDisplay(member)
                    )}
                  </TableCell>
                  <TableCell>
                    {memberUsage?.tokens_used.toLocaleString() || "0"} tokens
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <Progress value={usagePercentage} className="h-2" />
                      <span className="text-xs text-gray-500">
                        {usagePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMember(null);
                            setAllocations({
                              ...allocations,
                              [member.id]: undefined as any,
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveAllocation(member.id)}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingMember(member.id);
                          setAllocations({
                            ...allocations,
                            [member.id]: {
                              type: member.allocation_type || "unlimited",
                              value: member.allocation_value,
                            },
                          });
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Allocation Strategies</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              <strong>Unlimited:</strong> Member can use all available team
              tokens
            </li>
            <li>
              <strong>Percentage:</strong> Member can use a percentage of total
              team tokens
            </li>
            <li>
              <strong>Fixed Amount:</strong> Member has a specific token limit
            </li>
            <li>
              <strong>Equal Share:</strong> Tokens divided equally among all
              members
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
