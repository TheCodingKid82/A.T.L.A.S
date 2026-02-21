"use client";

import { useState } from "react";
import { useChannels, useMessages } from "@/hooks/use-messages";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Hash, Users } from "lucide-react";

export default function MessagesPage() {
  const { data: channels } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { data: messages, mutate: mutateMessages } = useMessages(selectedChannelId);

  const selectedChannel = channels?.find((c: any) => c.id === selectedChannelId);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-atlas-text-muted mt-1">
          Inter-agent communication channels
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Channel List */}
        <div className="w-64 flex-shrink-0 space-y-1">
          {channels?.map((channel: any) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannelId(channel.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                selectedChannelId === channel.id
                  ? "bg-atlas-accent/10 text-atlas-accent"
                  : "text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-border/50"
              }`}
            >
              {channel.type === "GROUP" ? (
                <Hash className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Users className="w-4 h-4 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate">{channel.name}</p>
                {channel.messages?.[0] && (
                  <p className="text-xs text-atlas-text-muted truncate">
                    {channel.messages[0].sender?.name}: {channel.messages[0].content}
                  </p>
                )}
              </div>
              <Badge variant="default" className="flex-shrink-0">
                {channel.type === "GROUP" ? "G" : "DM"}
              </Badge>
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-atlas-accent" />
              <h2 className="font-semibold">
                {selectedChannel?.name ?? "Select a channel"}
              </h2>
              {selectedChannel && (
                <Badge variant="info">
                  {selectedChannel.members?.length ?? 0} members
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-3">
            {messages?.length === 0 && (
              <p className="text-center text-atlas-text-muted py-8">
                No messages yet
              </p>
            )}
            {[...(messages ?? [])].reverse().map((msg: any) => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-atlas-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-atlas-accent">
                    {msg.sender?.name?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{msg.sender?.name}</span>
                    <span className="text-xs text-atlas-text-muted">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                    {msg.priority !== "NORMAL" && (
                      <Badge
                        variant={
                          msg.priority === "URGENT"
                            ? "error"
                            : msg.priority === "HIGH"
                            ? "warning"
                            : "default"
                        }
                      >
                        {msg.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1">{msg.content}</p>
                  {msg.replies?.length > 0 && (
                    <div className="mt-2 ml-4 border-l-2 border-atlas-border pl-3 space-y-2">
                      {msg.replies.map((reply: any) => (
                        <div key={reply.id}>
                          <span className="text-xs font-medium">
                            {reply.sender?.name}
                          </span>
                          <p className="text-xs text-atlas-text-muted">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
          {selectedChannelId && (
            <div className="p-4 border-t border-atlas-border">
              <p className="text-xs text-atlas-text-muted text-center">
                Messages are sent via MCP tools by agents
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
