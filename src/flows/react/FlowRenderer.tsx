import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { FlowProvider, type FlowProviderProps, useFlowContext } from './FlowContext';

export interface FlowRendererProps<TContext = any>
  extends FlowProviderProps<TContext> {
  style?: ViewStyle;
  renderCompleted?: (props: {
    context: TContext;
    result?: any;
    reset: () => void;
  }) => React.ReactNode;
  renderCancelled?: (props: {
    context: TContext;
    reset: () => void;
  }) => React.ReactNode;
}

function InnerFlowRenderer<TContext = any>({
  style,
  renderCompleted,
  renderCancelled,
}: {
  style?: ViewStyle;
  renderCompleted?: FlowRendererProps<TContext>['renderCompleted'];
  renderCancelled?: FlowRendererProps<TContext>['renderCancelled'];
}) {
  const { snapshot, reset } = useFlowContext<TContext>();
  const { currentStep, isCompleted, isCancelled, context, result } = snapshot;

  if (isCompleted) {
    if (renderCompleted) {
      return <>{renderCompleted({ context, result, reset })}</>;
    }
    return (
      <View style={[styles.centerContainer, style]}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Flow Completed</Text>
        <TouchableOpacity style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Restart Flow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isCancelled) {
    if (renderCancelled) {
      return <>{renderCancelled({ context, reset })}</>;
    }
    return (
      <View style={[styles.centerContainer, style]}>
        <Text style={styles.cancelEmoji}>🛑</Text>
        <Text style={styles.cancelTitle}>Flow Cancelled</Text>
        <TouchableOpacity style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render the step component if available
  const StepComponent =
    'component' in currentStep && currentStep.component
      ? currentStep.component
      : undefined;

  if (!StepComponent) {
    return (
      <View style={[styles.centerContainer, style]}>
        <Text style={styles.stepTitle}>
          Step: {currentStep.title ?? currentStep.id}
        </Text>
        <Text style={styles.stepDesc}>
          {currentStep.description ?? 'No component registered for this step.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <StepComponent />
    </View>
  );
}

export function FlowRenderer<TContext = any>({
  journey,
  variant,
  flow,
  initialContext,
  onComplete,
  onCancel,
  style,
  renderCompleted,
  renderCancelled,
}: FlowRendererProps<TContext>) {
  return (
    <FlowProvider
      journey={journey}
      variant={variant}
      flow={flow}
      initialContext={initialContext}
      onComplete={onComplete}
      onCancel={onCancel}>
      <InnerFlowRenderer
        style={style}
        renderCompleted={renderCompleted}
        renderCancelled={renderCancelled}
      />
    </FlowProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  cancelEmoji: {
    fontSize: 48,
  },
  cancelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#c93b2b',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#11181C',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
