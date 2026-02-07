package Web::Components::Model;

use Web::ComposableRequest::Constants
                          qw( EXCEPTION_CLASS FALSE NUL TRUE );
use HTTP::Status          qw( HTTP_OK HTTP_INTERNAL_SERVER_ERROR );
use Unexpected::Types     qw( HashRef LoadableClass Str );
use Unexpected::Functions qw( BadCSRFToken UnknownMethod );
use Scalar::Util          qw( blessed );
use Web::Components::Util qw( exception throw );
use Moo;

=pod

=encoding utf-8

=head1 Name

Web::Components::Model - Base class for Web Component models

=head1 Synopsis

   use Moo;

   extends 'Web::Components::Model';

=head1 Description

Base class for Web Component models

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=item C<context_class>

A required loadable class. The classname of the object created by
C<get_context>. Defaults to C<Web::Components::Loader::Context> a minimal
class which is provided

=cut

has 'context_class' =>
   is      => 'lazy',
   isa     => LoadableClass,
   coerce  => TRUE,
   default => sub {
      my $self   = shift;
      my $config = $self->config;

      return $config->context_class if $config->can('context_class');

      return 'Web::Components::Context';
   };

=item C<navigation_key>

An immutable string which defaults to C<nav>. Key used to stash the
L<Web::Components::Navigation|navigation object>

=cut

has 'navigation_key' => is => 'ro', isa => Str, default => 'nav';

has '_default_view' =>
   is      => 'lazy',
   isa     => Str,
   default => sub {
      my $self = shift;

      return $self->config->default_view if $self->config->can('default_view');

      return 'HTML';
   };

has '_exception_layout' =>
   is      => 'lazy',
   isa     => Str,
   default => sub {
      my $self   = shift;
      my $config = $self->config;

      return $config->exception_layout if $config->can('exception_layout');

      return 'misc/exception';
   };

has '_template_wrappers' =>
   is      => 'lazy',
   isa     => HashRef,
   default => sub {
      my $self   = shift;
      my $config = $self->config;

      return $config->template_wrappers if $config->can('template_wrappers');

      return {};
   };

=back

=head1 Subroutines/Methods

Defines the following methods;

=over 3

=item C<error>

Stash exception handler output to print an exception page.  Also called by
component loader if model dies

=cut

sub error {
   my ($self, $context, $proto, $bindv, @args) = @_;

   my $exception;
   my $class = blessed $proto;

   if ($class and $class->isa('Unexpected')) { $exception = $proto }
   elsif ($class) { $exception = exception $proto, $bindv // [], @args }
   else { $exception = exception $proto, $bindv // [], level => 2, @args }

   $self->log->error($exception, $context) if $self->can('log');

   my $nav  = $context->stash($self->navigation_key);
   my $code = $exception->rv || HTTP_INTERNAL_SERVER_ERROR;

   $code = HTTP_OK if $nav && $nav->is_script_request;

   $context->stash(
      code      => $code,
      exception => $exception,
      page      => {
         %{$self->_template_wrappers},
         layout => $self->_exception_layout
      },
      view      => $self->_default_view,
   );

   $self->_finalise_stash($context);

   $nav->stash_http_code if $nav;

   return;
}

=item C<execute>

Called by component loader for all model method calls. Calls each method in
the method chain if C<is_authorised> returns true for each one

=cut

sub execute {
   my ($self, $context, $methods) = @_;

   $context->stash(method_chain => $methods);

   my $nav_key  = $self->navigation_key;
   my $options  = { optional => TRUE, scrubber => FALSE };
   my $uri_args = $context->request->uri_params->($options);
   my $last_method;

   for my $method (split m{ / }mx, $context->stash('method_chain')) {
      my $stash   = $context->stash;
      my $model   = $stash->{model} // $self;
      my $coderef = $model->can($method);

      throw UnknownMethod, [blessed $model, $method] unless $coderef;

      if ($model->is_authorised($context, $coderef)) {
         my $method_args = $model->method_args($context, $coderef, $uri_args);

         $model->$method($context, @{$method_args});
         $last_method = $method;
      }

      if (my $action = delete $stash->{forward}) {
         return $self->_forward_action($context, $action);
      }

      return $stash->{response} if $stash->{response};

      $stash->{$nav_key}->stash_http_code if exists $stash->{$nav_key};

      return if $stash->{finalised} || exists $stash->{redirect};
   }

   $self->_finalise_stash($context, $last_method);
   return;
}

=item C<get_context>

Creates and returns a new context object from the request

=cut

sub get_context {
   my ($self, $args) = @_;

   return $self->context_class->new({ %{$args}, config => $self->config });
}

=item C<is_authorised>

Left unimplemented to force an exception if not overridden in a subclass

=cut

sub is_authorised { ... }

=item C<method_args>

This default method just returns the arguments passed to it. Override this
in a subclass to implement capture args

=cut

sub method_args {
   my ($self, $context, $action, $uri_args) = @_;

   return $uri_args;
}

=item C<verify_form_post>

Stash an exception if the CSRF token is bad

=cut

sub verify_form_post {
   my ($self, $context) = @_;

   my $reason = $context->verify_form_post;

   return TRUE unless $reason;

   $self->error($context, BadCSRFToken, [$reason], level => 3);
   return FALSE;
}

# Private methods
sub _finalise_stash { # Add necessary defaults for the view to render
   my ($self, $context, $method) = @_;

   my $stash = $context->stash;

   $stash->{code} //= HTTP_OK unless exists $stash->{redirect};
   $stash->{finalised} = TRUE;
   $stash->{page} = { %{$self->_template_wrappers}, %{$stash->{page} // {}} };
   $stash->{page}->{layout} //= $self->moniker . "/${method}";
   $stash->{view} //= $self->_default_view;
   return;
}

sub _forward_action {
   my ($self, $context, $action) = @_;

   my @parts    = split m{ / }mx, $context->method_chain($action);
   my $moniker  = shift @parts;
   my $endpoint = $parts[-1];

   $context->action("${moniker}/${endpoint}");

   return $context->models->{$moniker}->execute($context, join '/', @parts);
}

use namespace::autoclean;

1;

__END__

=back

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<Web::ComposableRequest>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2024 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
