// src/components/flow/FlowNode.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, RefreshCw } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GooglePicker from "../GooglePickerComponent";
import SlackFileUploader from "../SlackFileUploader";
import { DataFieldsEditor } from "@/components/ai/DataFieldsEditor";

interface PortTypeInfo {
  nodeId: string;
  portId: string;
  type: string;
  isAdaptive?: boolean;
}

interface FlowNodeProps {
  data: {
    config: any;
    onDelete: (id: string) => void;
    service: string;
    authState?: {
      isAuthenticated: boolean;
      tokens?: any;
    };
    onAuth?: () => void;
    portTypes?: PortTypeInfo[];
    removePortConnections?: (portId: string) => void;
    updateNodeConfig: (config: any) => void;
    executionState?: {
      success: boolean;
      error?: string;
      data?: any;
    };
  };
  id: string;
  isConnectable: boolean;
  selected?: boolean;
}

const FlowNode = ({ id, data, isConnectable, selected }: FlowNodeProps) => {
  const [config, setConfig] = useState(data.config);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [nodeWidth, setNodeWidth] = useState(320); // Default width
  const updateNodeInternals = useUpdateNodeInternals(); // Add this line

  // Add state for dynamic options loading
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, any[]>>(
    {}
  );
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>(
    {}
  );

  const serviceConfig = SERVICES[data.service];
  const { name, icon, actions } = serviceConfig;

  // Update local config when data.config changes
  useEffect(() => {
    console.log("Data config changed:", data.config);
    setConfig(data.config);
  }, [data.config]);

  // Function to handle dynamic options loading
  const handleOptionLoad = useCallback(
    async (field: any) => {
      if (!field.loadOptions) return;

      setLoadingOptions((prev) => ({ ...prev, [field.name]: true }));

      try {
        // Call the loadOptions function with the necessary context
        const options = await field.loadOptions({
          authState: data.authState,
          config,
        });

        setDynamicOptions((prev) => ({ ...prev, [field.name]: options }));
      } catch (error) {
        console.error(`Error loading options for ${field.name}:`, error);
      } finally {
        setLoadingOptions((prev) => ({ ...prev, [field.name]: false }));
      }
    },
    [data.authState, config]
  );

  // Calculate port spacing based on the number of ports
  const calculatePortSpacing = (portCount) => {
    const baseWidth = 90;
    const minWidth = 80;
    const reductionFactor = Math.min(1, 6 / portCount);
    return Math.max(minWidth, baseWidth * reductionFactor);
  };

  // Calculate and update the node width when ports change
  useEffect(() => {
    if (config.action && actions[config.action]?.ports) {
      const { inputs = [], outputs = [] } =
        config.ports || actions[config.action].ports;

      // Count active ports only
      const getActivePorts = (ports) => {
        return ports.filter((port) => port.isActive !== false);
      };

      const activePorts = {
        inputs: getActivePorts(inputs),
        outputs: getActivePorts(outputs),
      };

      // Calculate width based on active ports
      const inputPortWidth = calculatePortSpacing(activePorts.inputs.length);
      const outputPortWidth = calculatePortSpacing(activePorts.outputs.length);

      // Determine which set of ports needs more width
      const maxPortCount = Math.max(
        activePorts.inputs.length,
        activePorts.outputs.length
      );
      const portWidth = Math.max(inputPortWidth, outputPortWidth);

      // Calculate the node width with padding
      const calculatedWidth = Math.max(320, maxPortCount * portWidth + 80);

      // Set the new width with a slight delay to allow for animation
      setNodeWidth(calculatedWidth);
    }
  }, [config.action, config.ports, config.selectedColumns]);

  const handleConfigChange = (updates: Partial<any>) => {
    const newConfig = { ...config, ...updates };
    console.log("Updating config:", newConfig);
    setConfig(newConfig);

    // Check if we need to clean up connections from removed ports
    if (data.removePortConnections && config.ports && newConfig.ports) {
      // For Gmail email reader, check if emailInformation was changed
      if (
        data.service === "gmail" &&
        config.action === "READ_UNREAD" &&
        updates.emailInformation
      ) {
        // Find ports that are removed (were active but are now inactive)
        const oldEmailInfo = config.emailInformation || [];
        const newEmailInfo = updates.emailInformation || [];

        // Find email information types that were removed
        const removedInfo = oldEmailInfo.filter(
          (info) => !newEmailInfo.includes(info)
        );

        // Clean up connections for removed ports
        removedInfo.forEach((info) => {
          data.removePortConnections!(`output_${info}`);
        });
      }

      // For Sheets reader, check if selectedColumns was changed
      if (
        data.service === "sheets" &&
        (config.action === "READ_SHEET" ||
          config.action === "WRITE_SHEET" ||
          config.action === "UPDATE_SHEET") &&
        updates.selectedColumns
      ) {
        // Find columns that were removed
        const oldSelectedColumns = config.selectedColumns || [];
        const newSelectedColumns = updates.selectedColumns || [];

        // Find columns that were removed
        const removedColumns = oldSelectedColumns.filter(
          (col) => !newSelectedColumns.includes(col)
        );

        // Clean up connections for removed ports (either input or output depending on the action)
        removedColumns.forEach((column) => {
          if (config.action === "READ_SHEET") {
            data.removePortConnections!(`output_${column}`);
          } else if (
            config.action === "WRITE_SHEET" ||
            config.action === "UPDATE_SHEET"
          ) {
            data.removePortConnections!(`input_${column}`);
          }
        });
      }
    }

    // Update ports when relevant selections change
    if (
      (updates.selectedColumns && data.service === "sheets") ||
      (updates.emailInformation && data.service === "gmail") ||
      (updates.maxResults !== undefined &&
        data.service === "gmail" &&
        config.action === "READ_UNREAD") ||
      (updates.messageInformation &&
        data.service === "slack" &&
        config.action === "READ_MESSAGES") ||
      (updates.dataFields &&
        data.service === "ai" &&
        config.action === "EXTRACT_INFORMATION") ||
      (updates.extractList !== undefined &&
        data.service === "ai" &&
        config.action === "EXTRACT_INFORMATION") ||
        (updates.properties && data.service === "hubspot")  ||
        // Add this new condition for engagement types
        (updates.engagementTypes && 
          data.service === "hubspot" && 
          config.action === "ENGAGEMENT_READER")
    ) {
      if (newConfig.action && actions[newConfig.action]?.getDynamicPorts) {
        const ports = actions[newConfig.action].getDynamicPorts(newConfig);
        data.updateNodeConfig({
          ...newConfig,
          ports,
        });
        updateNodeInternals(id);
        return;
      }
    }

    data.updateNodeConfig(newConfig);
  };

  const handleActionSelect = async (action: string) => {
    // Special handling for AI service which doesn't need authentication
    if (data.service === "ai") {
      handleConfigChange({ action });
      return;
    }

    // Regular auth handling for other services
    if (!data.authState?.isAuthenticated) {
      localStorage.setItem(
        `${data.service}_pending_action`,
        JSON.stringify({
          nodeId: id,
          action,
        })
      );
      setShowAuthPrompt(true);
      return;
    }

    handleConfigChange({ action });
  };

  // Handle post-auth configuration
  useEffect(() => {
    if (data.authState?.isAuthenticated && showAuthPrompt) {
      const pendingAction = localStorage.getItem(
        `${data.service}_pending_action`
      );

      if (pendingAction) {
        try {
          const { nodeId, action } = JSON.parse(pendingAction);
          if (nodeId === id) {
            localStorage.removeItem(`${data.service}_pending_action`);
            handleConfigChange({ action });
            setShowAuthPrompt(false);
          }
        } catch (error) {
          console.error("Error parsing pending action:", error);
        }
      }
    }
  }, [data.authState?.isAuthenticated, data.service, id, showAuthPrompt]);

  // Update ports when configuration changes
  useEffect(() => {
    if (
      config.action &&
      actions[config.action]?.getDynamicPorts &&
      ((data.service === "sheets" && config.selectedColumns) ||
        (data.service === "gmail" &&
          (config.emailInformation || config.maxResults !== undefined)) ||
        (data.service === "ai" &&
          config.action === "EXTRACT_INFORMATION" &&
          (config.dataFields || config.extractList !== undefined))) 
    ) {
      const ports = actions[config.action].getDynamicPorts(config);
      data.updateNodeConfig({
        ...config,
        ports,
      });
      updateNodeInternals(id);
    }
  }, [
    config.selectedColumns,
    config.emailInformation,
    config.maxResults,
    config.dataFields,
    config.extractList,
    config.engagementTypes,
    config.action,
    id,
    updateNodeInternals,
  ]);

  const renderPorts = () => {
    if (!config.action || !actions[config.action]?.ports) return null;

    // Get all available ports from the action configuration or node config
    const { inputs = [], outputs = [] } =
      config.ports || actions[config.action].ports;

    // Function to get handle status for visual representation
    const getHandleStatus = (port: any, isInput: boolean) => {
      // Check if there's an execution state for this node
      if (data.executionState?.success) {
        // For outputs, check if there's actual data available
        if (
          !isInput &&
          data.executionState.data &&
          data.executionState.data[port.id] !== undefined
        ) {
          return "active-data"; // This output has actual data flowing through it
        }
      }

      return port.isActive ? "active" : "inactive";
    };

    // Function to format port label with one word per line without truncation
    const formatLabelOneWordPerLine = (label: string) => {
      // Split by spaces and join with line breaks
      return label.split(" ").map((word, i) => (
        <div
          key={i}
          className="text-center"
          style={{ fontSize: "0.65rem", lineHeight: "1.1" }}
        >
          {word}
        </div>
      ));
    };

    // Count active ports
    const activePorts = {
      inputs: inputs.filter((port) => port.isActive !== false),
      outputs: outputs.filter((port) => port.isActive !== false),
    };

    // Calculate port width allocations - ensure sufficient spacing
    const inputPortWidth = Math.max(
      90,
      calculatePortSpacing(activePorts.inputs.length)
    );
    const outputPortWidth = Math.max(
      90,
      calculatePortSpacing(activePorts.outputs.length)
    );

    return (
      <>
        {/* Input Ports with increased spacing */}
        <div className="absolute -top-1.5 left-0 right-0 flex justify-evenly items-center px-4">
          {inputs.map((port, index) => {
            const handleStatus = getHandleStatus(port, true);
            const isActive = handleStatus !== "inactive";
            const isList = port.isListType === true;

            // Skip rendering inactive ports completely
            if (!isActive) return null;

            return (
              <div
                key={`${port.id}-${index}`}
                className="relative group"
                style={{
                  width: `${inputPortWidth}px`,
                  height: "24px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  // margin: "0 20px" // Add extra margin for spacing
                }}
              >
                {/* Label with no truncation */}
                <div className="absolute top-0 transform -translate-y-full -translate-x-1/2 left-1/2">
                  <div
                    className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded shadow-sm border border-gray-200 flex flex-col items-center relative"
                    style={{
                      marginBottom: "7px",
                      minWidth: "50px",
                      maxWidth: "70px",
                      width: "auto",
                    }}
                  >
                    {formatLabelOneWordPerLine(port.label)}

                    {/* Simple list indicator */}
                    {isActive && isList && (
                      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-0.5 text-gray-500 text-[0.6rem]">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="4"
                            y="4"
                            width="16"
                            height="16"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <rect
                            x="8"
                            y="8"
                            width="8"
                            height="2"
                            fill="currentColor"
                          />
                          <rect
                            x="8"
                            y="12"
                            width="8"
                            height="2"
                            fill="currentColor"
                          />
                          <rect
                            x="8"
                            y="16"
                            width="8"
                            height="2"
                            fill="currentColor"
                          />
                        </svg>
                        List
                      </div>
                    )}
                  </div>
                </div>

                <Handle
                  type="target"
                  position={Position.Top}
                  id={port.id}
                  isConnectable={isConnectable}
                  style={{
                    minWidth: "9px",
                    minHeight: "9px",
                    width: "9px",
                    height: "9px",
                    top: 0,
                  }}
                  className={cn(
                    "rounded-full border-2 transition-colors",
                    handleStatus === "active-data"
                      ? "!bg-blue-500 !border-black !shadow-sm !shadow-blue-300"
                      : "!bg-white !border-black"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Output Ports with increased spacing */}
        <div className="absolute -bottom-1.5 left-0 right-0 flex justify-evenly items-center px-4">
          {outputs.map((port, index) => {
            const handleStatus = getHandleStatus(port, false);
            const isActive = handleStatus !== "inactive";
            const isList = port.isListType === true;

            // Skip rendering inactive ports completely
            if (!isActive) return null;

            return (
              <div
                key={`${port.id}-${index}`}
                className="relative group"
                style={{
                  width: `${outputPortWidth}px`,
                  height: "24px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  // margin: "0 38px" // Add extra margin for spacing
                }}
              >
                {/* Label with no truncation */}
                <div className="absolute bottom-0 transform translate-y-full -translate-x-1/2 left-1/2">
                  <div
                    className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded shadow-sm border border-gray-200 flex flex-col items-center relative"
                    style={{
                      marginTop: "7px",
                      minWidth: "50px",
                      maxWidth: "70px",
                      width: "auto",
                    }}
                  >
                    {formatLabelOneWordPerLine(port.label)}

                    {/* Simple list indicator */}
                    {isActive && isList && (
                      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-0.5 text-gray-500 text-[0.6rem]">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="4"
                            y="4"
                            width="16"
                            height="16"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <rect
                            x="8"
                            y="8"
                            width="8"
                            height="2"
                            fill="currentColor"
                          />
                          <rect
                            x="8"
                            y="12"
                            width="8"
                            height="2"
                            fill="currentColor"
                          />
                          <rect
                            x="8"
                            y="16"
                            width="8"
                            height="2"
                            fill="currentColor"
                          />
                        </svg>
                        List
                      </div>
                    )}
                  </div>
                </div>

                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={port.id}
                  isConnectable={isConnectable}
                  style={{
                    minWidth: "9px",
                    minHeight: "9px",
                    width: "9px",
                    height: "9px",
                    bottom: 0,
                  }}
                  className={cn(
                    "rounded-full border-2 transition-colors",
                    handleStatus === "active-data"
                      ? "!bg-green-500 !border-black !shadow-sm !shadow-green-300"
                      : "!bg-white !border-black"
                  )}
                />
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Calculate and update the node width when ports change
  useEffect(() => {
    if (config.action && actions[config.action]?.ports) {
      const { inputs = [], outputs = [] } =
        config.ports || actions[config.action].ports;

      // Count active ports only
      const getActivePorts = (ports) => {
        return ports.filter((port) => port.isActive !== false);
      };

      const activePorts = {
        inputs: getActivePorts(inputs),
        outputs: getActivePorts(outputs),
      };

      // Calculate width based on active ports - ensure sufficient space for labels
      const inputPortWidth = Math.max(
        90,
        calculatePortSpacing(activePorts.inputs.length)
      );
      const outputPortWidth = Math.max(
        90,
        calculatePortSpacing(activePorts.outputs.length)
      );

      // Determine which set of ports needs more width
      const maxPortCount = Math.max(
        activePorts.inputs.length,
        activePorts.outputs.length
      );
      const portWidth = Math.max(inputPortWidth, outputPortWidth);

      // Add extra padding (80px) plus enough space for all ports with their margins
      const calculatedWidth = Math.max(
        320,
        maxPortCount * portWidth + maxPortCount * 35 + 80
      );

      // Set the new width with a slight delay to allow for animation
      setNodeWidth(calculatedWidth);
    }
  }, [config.action, config.ports, config.selectedColumns]);

  const renderHeader = (actionName?: string) => (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <img src={icon} alt={name} className="w-6 h-6" />
        <div>
          <div className="font-medium">{name}</div>
          {actionName && (
            <div className="text-sm text-gray-500">{actionName}</div>
          )}
          {data.service === "ai" && config.model && (
            <div className="text-xs text-gray-400 flex items-center mt-1 gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {config.model.includes("anthropic") ? (
                <span className="text-purple-600 font-medium">Anthropic</span>
              ) : config.model.includes("openai") ? (
                <span className="text-emerald-600 font-medium">OpenAI</span>
              ) : (
                <span className="font-medium">
                  {config.model.split("/")[0]}
                </span>
              )}
              <span className="opacity-60">{config.model.split("/")[1]}</span>
            </div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 absolute -top-2 -right-2 hover:bg-gray-100 rounded-full"
        onClick={() => data.onDelete(id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  // Function to check if a field should be visible based on dependencies
  const isFieldVisible = (field: any, config: any): boolean => {
    // If no dependencies or visibilityCondition specified, field is always visible
    if (
      (!field.dependencies || field.dependencies.length === 0) &&
      !field.visibilityCondition
    ) {
      return true;
    }

    // First check dependencies
    const dependenciesSatisfied =
      !field.dependencies ||
      field.dependencies.every((dep: string) => {
        return (
          config[dep] !== undefined &&
          config[dep] !== null &&
          config[dep] !== ""
        );
      });

    // If dependencies aren't satisfied, return false immediately
    if (!dependenciesSatisfied) {
      return false;
    }

    // If there's a visibilityCondition function, evaluate it
    if (
      field.visibilityCondition &&
      typeof field.visibilityCondition === "function"
    ) {
      return field.visibilityCondition(config);
    }

    // If we get here, dependencies are satisfied and there's no visibilityCondition
    return true;
  };

  if (showAuthPrompt) {
    return (
      <Card className="p-4 w-80">
        {renderHeader()}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              Authentication required to use {name} actions
            </p>
            <Button className="w-full bg-black" onClick={data.onAuth}>
              Login with {name}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (config.action) {
    const action = actions[config.action];

    return (
      <Card
        id={`node-${id}`}
        className={`p-4 ${selected ? "ring-2 ring-blue-500" : ""}`}
        style={{
          width: `${nodeWidth}px`,
          transition: "width 0.3s ease-out", // Add smooth animation
        }}
      >
        {renderPorts()}
        {renderHeader(action.name)}
        {data.service === "sheets" && (
          <div className="text-xs text-gray-500 italic mb-4 py-2 border-t border-b border-gray-100">
            Your Google Sheet must have headers in the first row
          </div>
        )}

        <div className="space-y-4">
          {action.configFields.map((field) => {
            // Skip rendering the 'selectedColumns' field if no spreadsheet is selected yet
            if (
              !config.spreadsheetId &&
              (field.name === "selectedColumns" ||
                field.name === "searchColumn" ||
                field.name === "searchValue" ||
                field.name === "updaterMode")
            ) {
              return null;
            }

            // Skip fields that shouldn't be visible based on dependencies
            if (!isFieldVisible(field, config)) {
              return null;
            }

            return (
              <div key={field.name} className="space-y-2">
                <Label>
                  <strong>{field.label}</strong>
                </Label>

                {field.type === "dataFields" ? (
                  <DataFieldsEditor
                    value={config[field.name] || []}
                    onChange={(value) =>
                      handleConfigChange({ [field.name]: value })
                    }
                  />
                ) : field.type === "boolean" ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={field.name}
                      checked={!!config[field.name]}
                      onChange={(e) =>
                        handleConfigChange({ [field.name]: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor={field.name}
                      className="text-sm text-gray-700"
                    >
                      {field.label}
                    </label>
                  </div>
                ) : field.type === "file" ? (
                  <SlackFileUploader
                    selectedFiles={config[field.name] || null}
                    onFilesSelected={(files) =>
                      handleConfigChange({ [field.name]: files })
                    }
                  />
                ) : field.type === "text" ? (
                  <Textarea
                    value={config[field.name] || ""}
                    onChange={(e) =>
                      handleConfigChange({ [field.name]: e.target.value })
                    }
                    placeholder={
                      field.placeholder || `Enter ${field.label.toLowerCase()}`
                    }
                  />
                ) : field.type === "select" ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={config[field.name] || ""}
                        onValueChange={(value) =>
                          handleConfigChange({ [field.name]: value })
                        }
                        onOpenChange={(open) => {
                          // Only auto-load options if this field doesn't have a refresh button
                          if (open && field.loadOptions && !field.refreshable) {
                            handleOptionLoad(field);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              field.placeholder ||
                              `Select ${field.label.toLowerCase()}`
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Handle dynamic options first */}
                          {field.loadOptions ? (
                            loadingOptions[field.name] ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                Loading options...
                              </div>
                            ) : dynamicOptions[field.name]?.length > 0 ? (
                              dynamicOptions[field.name].map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-gray-500">
                                No options available
                              </div>
                            )
                          ) : (
                            // If not using loadOptions, use static options as before
                            // Updated code
                            (field.name === "searchColumn" &&
                            config.availableColumns
                              ? config.availableColumns
                              : field.options
                            )?.map(
                              (
                                option:
                                  | {
                                      value: string;
                                      label: string;
                                      isHeader?: boolean;
                                      badge?: string;
                                    }
                                  | string
                              ) => {
                                // Handle simple string options
                                if (typeof option === "string") {
                                  return (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  );
                                }

                                // Handle header items
                                if (option.isHeader) {
                                  return (
                                    <div
                                      key={option.value}
                                      className="px-2 py-1.5 text-sm font-semibold text-gray-500 border-b"
                                    >
                                      {option.label}
                                    </div>
                                  );
                                }

                                // Handle regular items with optional badge
                                return (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{option.label}</span>
                                      {option.badge && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-pink-100 text-pink-600 rounded">
                                          {option.badge}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              }
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Add refresh button for fields that support it */}
                    {field.refreshable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2"
                        onClick={() => handleOptionLoad(field)}
                        disabled={loadingOptions[field.name]}
                        title={`Refresh ${field.label.toLowerCase()}`}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            loadingOptions[field.name] ? "animate-spin" : ""
                          }`}
                        />
                      </Button>
                    )}
                  </div>
                ) : field.type === "google-picker" ? (
                  <GooglePicker
                    onFileSelect={async (fileDetails) => {
                      try {
                        if (field.onValueSelect) {
                          const newConfig = await field.onValueSelect(
                            fileDetails,
                            config,
                            { tokens: data.authState?.tokens }
                          );
                          data.updateNodeConfig(newConfig);
                        } else {
                          handleConfigChange({
                            [field.name]: fileDetails.id,
                            fileDetails: fileDetails,
                          });
                        }
                      } catch (error) {
                        console.error("Error handling file selection:", error);
                      }
                    }}
                    selectedFile={config.fileDetails}
                    serviceType={data.service}
                    title={field.pickerOptions?.title}
                    pickerOptions={{
                      viewTypes: field.pickerOptions?.viewTypes || [
                        "ALL_DRIVE_ITEMS",
                      ],
                      selectFolders:
                        field.pickerOptions?.selectFolders || false,
                      mimeTypes: field.pickerOptions?.mimeTypes,
                    }}
                  />
                ) : field.type === "multiselect" ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(config[field.name] || []).map((value: string) => {
                        // Find the option to get its label
                        let displayName = value;
                        const option = (
                          config.availableColumns ||
                          field.options ||
                          []
                        ).find((opt: any) =>
                          typeof opt === "object"
                            ? opt.value === value
                            : opt === value
                        );

                        if (option) {
                          // Use the label if available, otherwise format the value
                          displayName =
                            typeof option === "object"
                              ? option.label
                              : option.replace(/_/g, " ");
                        } else {
                          // Format the ID if no matching option found
                          displayName = value.replace(/_/g, " ");
                        }

                        return (
                          <div
                            key={value}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                          >
                            <span className="truncate">{displayName}</span>
                            <button
                              onClick={() => {
                                const newValues = (
                                  config[field.name] || []
                                ).filter((v: string) => v !== value);
                                handleConfigChange({ [field.name]: newValues });
                              }}
                              className="hover:text-blue-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const currentValues = config[field.name] || [];
                        if (!currentValues.includes(value)) {
                          handleConfigChange({
                            [field.name]: [...currentValues, value],
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            field.placeholder ||
                            `Select ${field.label.toLowerCase()}`
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(config.availableColumns || field.options)?.map(
                          (
                            option: string | { value: string; label: string }
                          ) => {
                            const optionValue =
                              typeof option === "string"
                                ? option
                                : option.value;
                            const optionLabel =
                              typeof option === "string"
                                ? option.replace(/_/g, " ")
                                : option.label;
                            return (
                              <SelectItem
                                key={optionValue}
                                value={optionValue}
                                disabled={(config[field.name] || []).includes(
                                  optionValue
                                )}
                              >
                                {optionLabel}
                              </SelectItem>
                            );
                          }
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Input
                    type={field.type}
                    value={config[field.name] || ""}
                    onChange={(e) =>
                      handleConfigChange({ [field.name]: e.target.value })
                    }
                    placeholder={
                      field.placeholder || `Enter ${field.label.toLowerCase()}`
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 w-80">
      {renderHeader()}
      <div className="space-y-2">
        {Object.entries(actions).map(([actionKey, action]) => (
          <Button
            key={actionKey}
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleActionSelect(actionKey)}
          >
            {action.name}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default FlowNode;
